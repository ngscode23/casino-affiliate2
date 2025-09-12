// // supabase_helper.cpp
// // Supabase PG helper (pooler failover + tooling) — C++ edition.
// // Требует: psql в PATH (или PSQL_BIN), опционально supabase CLI (или SUPABASE_BIN).
// // C++20, Linux/macOS. Без внешних зависимостей.

// #include <algorithm>
// #include <atomic>
// #include <chrono>
// #include <csignal>
// #include <cstdarg>
// #include <cstdio>
// #include <cstdlib>
// #include <cstring>
// #include <ctime>
// #include <filesystem>
// #include <fstream>
// #include <functional>
// #include <future>
// #include <iomanip>
// #include <iostream>
// #include <map>
// #include <mutex>
// #include <optional>
// #include <random>
// #include <regex>
// #include <set>
// #include <sstream>
// #include <string>
// #include <string_view>
// #include <thread>
// #include <tuple>
// #include <utility>
// #include <vector>

// // POSIX sockets / DNS
// #include <netdb.h>
// #include <netinet/in.h>
// #include <sys/socket.h>
// #include <sys/stat.h>
// #include <sys/types.h>
// #include <sys/wait.h>
// #include <unistd.h>

// using namespace std;

// namespace fs = std::filesystem;

// // ================== УТИЛЫ ==================

// static string now_iso() {
//     using clock = chrono::system_clock;
//     auto t = clock::now();
//     time_t tt = clock::to_time_t(t);
//     tm tm{};
//     localtime_r(&tt, &tm);
//     auto ms = chrono::duration_cast<chrono::milliseconds>(t.time_since_epoch()) % 1000;
//     char buf[64];
//     strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &tm);
//     ostringstream oss;
//     oss << buf << '.' << setw(3) << setfill('0') << ms.count();
//     // без TZ, достаточно для логов
//     return oss.str();
// }

// static string now_date_compact() {
//     time_t tt = time(nullptr);
//     tm tm{};
//     localtime_r(&tt, &tm);
//     char buf[32];
//     strftime(buf, sizeof(buf), "%Y%m%d", &tm);
//     return buf;
// }

// static string color(const string& s, const string& code) {
//     return "\033[" + code + "m" + s + "\033[0m";
// }

// static string env_or(const char* k, const string& def) {
//     const char* v = getenv(k);
//     return v ? string(v) : def;
// }

// static bool str_ieq(string a, string b) {
//     transform(a.begin(), a.end(), a.begin(), ::tolower);
//     transform(b.begin(), b.end(), b.begin(), ::tolower);
//     return a == b;
// }

// static string replace_all(string s, string_view from, string_view to) {
//     size_t pos = 0;
//     while ((pos = s.find(from, pos)) != string::npos) {
//         s.replace(pos, from.size(), to);
//         pos += to.size();
//     }
//     return s;
// }

// static string mask_url(const string& url) {
//     if (url.empty()) return url;
//     static regex re(R"(://([^:]+):([^@]+)@)");
//     return regex_replace(url, re, "://$1:***@");
// }

// static string url_encode(const string& s) {
//     static const char* hex = "0123456789ABCDEF";
//     string out; out.reserve(s.size()*3);
//     for (unsigned char c : s) {
//         if (isalnum(c) || c=='-'||c=='_'||c=='.'||c=='~') out.push_back(c);
//         else { out.push_back('%'); out.push_back(hex[c>>4]); out.push_back(hex[c&15]); }
//     }
//     return out;
// }

// // ================== КОНФИГ/ЛОГИ ==================

// struct Config {
//     string DB_USER;
//     string DB_PASSWORD;
//     string DB_NAME;
//     string POOLER_FQDN;
//     int    PORT_POOLER;
//     string DIRECT_HOST;
//     int    PORT_DIRECT;
//     double TCP_TIMEOUT;
//     int    PSQL_CONNSEC;
//     int    MAX_TRIES;
//     fs::path LOG_DIR;
//     bool   JSON_LOG;
//     vector<string> EXTRA_IPS;
//     string PSQL_BIN;
//     string SUPABASE_BIN;
//     fs::path PROM_FILE;
// } CFG;

// static fs::path ROOT;

// enum class LogLevel { DEBUG_=0, INFO, WARN, ERROR_ };

// static LogLevel CONSOLE_LEVEL = LogLevel::INFO;
// static fs::path LOG_TXT, LOG_JSON;
// static mutex LOG_MTX;

// static string level_str(LogLevel L) {
//     switch (L) {
//         case LogLevel::DEBUG_: return "DEBUG";
//         case LogLevel::INFO: return "INFO";
//         case LogLevel::WARN: return "WARN";
//         default: return "ERROR";
//     }
// }

// static void ensure_dirs(const fs::path& p) {
//     error_code ec;
//     fs::create_directories(p, ec);
// }

// static uintmax_t file_size_safe(const fs::path& p) {
//     error_code ec; auto sz = fs::file_size(p, ec);
//     return ec ? 0 : sz;
// }

// static void rotate_file(const fs::path& p, size_t maxBytes=5*1024*1024, int backupCount=5) {
//     if (!fs::exists(p)) return;
//     if (file_size_safe(p) < maxBytes) return;
//     // Удаляем самый старый
//     fs::path base = p;
//     fs::path last = p; last += "." + to_string(backupCount);
//     if (fs::exists(last)) fs::remove(last);
//     // Сдвиг
//     for (int i=backupCount-1; i>=1; --i) {
//         fs::path src = p; src += "." + to_string(i);
//         fs::path dst = p; dst += "." + to_string(i+1);
//         if (fs::exists(src)) fs::rename(src, dst);
//     }
//     fs::path first = p; first += ".1";
//     fs::rename(p, first);
// }

// static void log_json(LogLevel L, const string& msg, optional<string> meta = nullopt) {
//     if (!CFG.JSON_LOG) return;
//     lock_guard<mutex> lk(LOG_MTX);
//     rotate_file(LOG_JSON);
//     ofstream f(LOG_JSON, ios::app);
//     if (!f) return;
//     f << "{\"ts\":\"" << now_iso() << "\",\"level\":\"" << level_str(L) << "\",\"msg\":"
//       << std::quoted(msg);
//     if (meta) f << ",\"meta\":" << *meta;
//     f << "}\n";
// }

// static void log_line(LogLevel L, const string& msg, optional<string> meta = nullopt) {
//     // консоль
//     if ((int)L >= (int)CONSOLE_LEVEL) {
//         // [HH:MM:SS][LEVEL] msg
//         time_t tt = time(nullptr); tm tm{};
//         localtime_r(&tt, &tm);
//         char hh[16]; strftime(hh, sizeof(hh), "%H:%M:%S", &tm);
//         cerr << "[" << hh << "][" << level_str(L) << "] " << msg << "\n";
//     }
//     // файл-текст
//     {
//         lock_guard<mutex> lk(LOG_MTX);
//         rotate_file(LOG_TXT);
//         ofstream f(LOG_TXT, ios::app);
//         if (f) {
//             time_t tt = time(nullptr); tm tm{};
//             localtime_r(&tt, &tm);
//             char ts[32]; strftime(ts, sizeof(ts), "%Y-%m-%d %H:%M:%S", &tm);
//             f << "[" << ts << "][" << level_str(L) << "] " << msg << "\n";
//         }
//     }
//     log_json(L, msg, meta);
// }

// // ================== .env ==================

// static void load_dotenv(const fs::path& p) {
//     if (p.empty() || !fs::exists(p)) return;
//     ifstream in(p);
//     string raw;
//     regex re(R"(^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$)");
//     while (getline(in, raw)) {
//         string line = raw;
//         // trim
//         auto ltrim = [](string& s){ s.erase(s.begin(), find_if(s.begin(), s.end(), [](int ch){return !isspace(ch);})); };
//         auto rtrim = [](string& s){ s.erase(find_if(s.rbegin(), s.rend(), [](int ch){return !isspace(ch);}).base(), s.end()); };
//         ltrim(line); rtrim(line);
//         if (line.empty() || line.rfind("#",0)==0) continue;
//         if (line.rfind("export ",0)==0) line = line.substr(7);
//         smatch m;
//         if (!regex_match(line, m, re)) continue;
//         string k = m[1], v = m[2];
//         // quote handling + inline comment with " #"
//         if ((v.size()>=2 && ((v.front()=='"' && v.back()=='"') || (v.front()=='\'' && v.back()=='\'')))) {
//             v = v.substr(1, v.size()-2);
//         } else {
//             auto pos = v.find(" #");
//             if (pos != string::npos) v = string(v.begin(), v.begin()+pos);
//             rtrim(v);
//         }
//         if (v.empty()) {
//             unsetenv(k.c_str());
//         } else {
//             setenv(k.c_str(), v.c_str(), 1);
//         }
//     }
// }

// // ================== ПРОЦЕССЫ ==================

// struct CmdResult { int code; string out; };

// static CmdResult run_cmd(vector<string> args) {
//     if (!args.empty() && args[0] == "psql")     args[0] = CFG.PSQL_BIN;
//     if (!args.empty() && args[0] == "supabase") args[0] = CFG.SUPABASE_BIN;

//     // Собираем команду с экранированием и объединением stderr
//     ostringstream oss;
//     for (size_t i=0;i<args.size();++i) {
//         oss << (i?" ":"");
//         // простая безопасная обёртка
//         oss << "'";
//         for (char c: args[i]) {
//             if (c=='\'') oss << "'\"'\"'";
//             else oss << c;
//         }
//         oss << "'";
//     }
//     oss << " 2>&1";

//     string cmd = oss.str();
//     FILE* pipe = popen(cmd.c_str(), "r");
//     if (!pipe) return {-1, "failed to start: " + cmd};
//     string out;
//     char buf[4096];
//     while (fgets(buf, sizeof(buf), pipe)) {
//         out.append(buf);
//     }
//     int st = pclose(pipe);
//     int code = WIFEXITED(st) ? WEXITSTATUS(st) : -1;
//     // trim trailing newlines
//     while (!out.empty() && (out.back()=='\n' || out.back()=='\r')) out.pop_back();
//     return {code, out};
// }

// // ================== СЕТЬ ==================

// static vector<string> resolve_a_records(const string& fqdn) {
//     vector<string> res;
//     addrinfo hints{}; hints.ai_family = AF_INET; hints.ai_socktype=SOCK_STREAM; hints.ai_protocol=IPPROTO_TCP;
//     addrinfo* ai = nullptr;
//     if (getaddrinfo(fqdn.c_str(), nullptr, &hints, &ai) != 0) return res;
//     set<string> uniq;
//     for (auto p=ai; p; p=p->ai_next) {
//         sockaddr_in* sin = (sockaddr_in*)p->ai_addr;
//         char buf[INET_ADDRSTRLEN];
//         if (inet_ntop(AF_INET, &sin->sin_addr, buf, sizeof(buf))) {
//             uniq.insert(buf);
//         }
//     }
//     freeaddrinfo(ai);
//     res.assign(uniq.begin(), uniq.end());
//     return res;
// }

// static bool test_tcp(const string& host, int port, double timeout_sec) {
//     int fd = socket(AF_INET, SOCK_STREAM, 0);
//     if (fd<0) return false;
//     sockaddr_in addr{}; addr.sin_family=AF_INET; addr.sin_port=htons(port);
//     if (inet_pton(AF_INET, host.c_str(), &addr.sin_addr) != 1) { close(fd); return false; }
//     // таймаут
//     timeval tv{};
//     tv.tv_sec = (int)timeout_sec;
//     tv.tv_usec = (int)((timeout_sec - (int)timeout_sec)*1e6);
//     setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));
//     setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
//     int rc = ::connect(fd, (sockaddr*)&addr, sizeof(addr));
//     close(fd);
//     return rc == 0;
// }

// // ================== PROM, КЭШ ==================

// static fs::path PROM_PATH;
// static void write_metrics(bool pooler_ok) {
//     try {
//         ensure_dirs(PROM_PATH.parent_path());
//         auto ts = chrono::duration_cast<chrono::seconds>(chrono::system_clock::now().time_since_epoch()).count();
//         ostringstream oss;
//         oss << "# HELP supabase_pooler_up Pooler availability\n"
//             << "# TYPE supabase_pooler_up gauge\n"
//             << "supabase_pooler_up " << (pooler_ok?1:0) << " " << ts << "\n";
//         ofstream f(PROM_PATH);
//         if (f) f << oss.str();
//     } catch (...) { /*ignore*/ }
// }

// static fs::path CACHE;
// static void cache_save(const string& host) {
//     try {
//         ofstream f(CACHE);
//         if (f) f << "{\"last_host\":\"" << host << "\"}\n";
//     } catch(...) {}
// }
// static optional<string> cache_load() {
//     try {
//         ifstream f(CACHE);
//         if (!f) return nullopt;
//         string s((istreambuf_iterator<char>(f)), {});
//         smatch m; regex re(R"(\"last_host\"\s*:\s*\"([^\"]+)\")");
//         if (regex_search(s, m, re)) return string(m[1]);
//     } catch(...) {}
//     return nullopt;
// }

// // ================== URL/LOGIN ==================

// static string build_url(const string& host, int port) {
//     string esc_pass = url_encode(CFG.DB_PASSWORD);
//     ostringstream oss;
//     oss << "postgres://" << CFG.DB_USER << ":" << esc_pass << "@"
//         << host << ":" << port << "/" << CFG.DB_NAME
//         << "?sslmode=require&connect_timeout=" << CFG.PSQL_CONNSEC;
//     return oss.str();
// }

// static bool try_login(const string& url) {
//     auto r = run_cmd({"psql", url, "-v", "ON_ERROR_STOP=1", "-tAc", "select 1"});
//     return r.code == 0;
// }

// static void backoff(int attempt) {
//     // base=0.2*(2^(attempt-1)), jitter [0..0.15], capped 3.0
//     double base = 0.2 * pow(2.0, max(0, attempt-1));
//     static random_device rd; static mt19937_64 gen(rd());
//     uniform_real_distribution<double> dist(0.0, 0.15);
//     double t = min(base + dist(gen), 3.0);
//     this_thread::sleep_for(chrono::duration<double>(t));
// }

// static optional<string> pick_working_url_fast(const vector<string>& hosts, int port) {
//     atomic<bool> done{false};
//     mutex cout_mtx;
//     vector<future<pair<string, optional<string>>>> futs;
//     auto worker = [&](string h) -> pair<string, optional<string>> {
//         if (done.load()) return {h, nullopt};
//         bool tcp = test_tcp(h, port, CFG.TCP_TIMEOUT);
//         if (!tcp) {
//             lock_guard<mutex> lk(cout_mtx);
//             cout << "Пробую " << h << ":" << port << " ... ✖" << endl;
//             return {h, nullopt};
//         }
//         string url = build_url(h, port);
//         bool ok = try_login(url);
//         {
//             lock_guard<mutex> lk(cout_mtx);
//             cout << "Пробую " << h << ":" << port << " ... " << (ok ? "✔" : "✖") << endl;
//         }
//         if (ok) { done.store(true); return {h, url}; }
//         return {h, nullopt};
//     };
//     for (auto& h: hosts) {
//         futs.emplace_back(async(launch::async, worker, h));
//     }
//     for (auto& f: futs) {
//         auto [h, url] = f.get();
//         if (url) {
//             // отменить остальных не можем, но уже флаг установлен
//             return url;
//         }
//     }
//     return nullopt;
// }

// // ================== ГЛОБАЛЬНОЕ СОСТОЯНИЕ ОКРУЖЕНИЯ ==================

// static void set_env(const string& k, const string& v) { setenv(k.c_str(), v.c_str(), 1); }
// static void unset_env(const string& k) { unsetenv(k.c_str()); }

// static pair<optional<string>, string> choose_env(bool use_direct=false, bool force_pooler=false) {
//     if (use_direct) {
//         string direct = build_url(CFG.DIRECT_HOST, CFG.PORT_DIRECT);
//         unset_env("SUPABASE_DB_POOLER");
//         set_env("SUPABASE_DB_DIRECT", direct);
//         cout << "\nDirect режим. SUPABASE_DB_DIRECT = " << mask_url(direct) << "\n";
//         write_metrics(false);
//         return {nullopt, direct};
//     }

//     vector<string> candidates;
//     if (auto last = cache_load()) candidates.push_back(*last);
//     if (const char* prev = getenv("SUPABASE_DB_POOLER")) {
//         try {
//             string s(prev);
//             smatch m;
//             if (regex_search(s, m, regex(R"(@([^:/]+):\d+/)"))) candidates.push_back(m[1]);
//         } catch(...) {}
//     }
//     candidates.push_back(CFG.POOLER_FQDN);
//     auto dns = resolve_a_records(CFG.POOLER_FQDN);
//     candidates.insert(candidates.end(), dns.begin(), dns.end());
//     for (auto& ip: CFG.EXTRA_IPS) candidates.push_back(ip);

//     // unique preserve order
//     set<string> seen;
//     vector<string> uniq;
//     for (auto& x: candidates) if (!x.empty() && !seen.count(x)) { uniq.push_back(x); seen.insert(x); }

//     cout << "\nКандидаты пулера:\n";
//     for (auto& cnd: uniq) cout << "  - " << cnd << "\n";

//     auto pooler_url = pick_working_url_fast(uniq, CFG.PORT_POOLER);
//     if (!pooler_url) {
//         if (force_pooler) throw runtime_error("Пулер обязателен (--force-pooler), но недоступен.");
//         string msg = "Не удалось подключиться к пулеру " + CFG.POOLER_FQDN + ":" + to_string(CFG.PORT_POOLER)
//                    + ". Перехожу на direct " + CFG.DIRECT_HOST + ":" + to_string(CFG.PORT_DIRECT);
//         log_line(LogLevel::WARN, msg);
//         string direct = build_url(CFG.DIRECT_HOST, CFG.PORT_DIRECT);
//         unset_env("SUPABASE_DB_POOLER");
//         set_env("SUPABASE_DB_DIRECT", direct);
//         write_metrics(false);
//         return {nullopt, direct};
//     }

//     set_env("SUPABASE_DB_POOLER", *pooler_url);
//     string direct_url = build_url(CFG.DIRECT_HOST, CFG.PORT_DIRECT);
//     set_env("SUPABASE_DB_DIRECT", direct_url);

//     cout << "\nSUPABASE_DB_POOLER = " << mask_url(*pooler_url) << "\n";
//     cout << "SUPABASE_DB_DIRECT = " << mask_url(direct_url) << "\n";

//     smatch m;
//     if (regex_search(*pooler_url, m, regex(R"(@([^:/]+):\d+/)"))) cache_save(m[1]);
//     write_metrics(true);
//     return {pooler_url, direct_url};
// }

// static bool psql_failover(const string& sql) {
//     int tries = CFG.MAX_TRIES;
//     for (int i=1; i<=tries; ++i) {
//         string url = env_or("SUPABASE_DB_POOLER", "");
//         if (url.empty()) {
//             auto envs = choose_env();
//             url = env_or("SUPABASE_DB_POOLER", "");
//         }
//         if (url.empty()) {
//             string direct = env_or("SUPABASE_DB_DIRECT", "");
//             if (direct.empty()) direct = build_url(CFG.DIRECT_HOST, CFG.PORT_DIRECT);
//             auto r = run_cmd({"psql", direct, "-v", "ON_ERROR_STOP=1", "-c", sql});
//             cout << r.out << "\n";
//             return r.code == 0;
//         }
//         log_line(LogLevel::DEBUG_, "SQL попытка " + to_string(i) + "/" + to_string(tries) + ": " + sql);
//         auto r = run_cmd({"psql", url, "-v", "ON_ERROR_STOP=1", "-c", sql});
//         cout << r.out << "\n";
//         if (r.code == 0) return true;
//         cout << color("psql не прошёл (попытка "+to_string(i)+"/"+to_string(tries)+") — переизбираю хост...", "33") << "\n";
//         unset_env("SUPABASE_DB_POOLER");
//         backoff(i);
//     }
//     throw runtime_error("Все попытки выполнить SQL исчерпаны.");
// }

// // ================== КОМАНДЫ ==================

// static void cmd_show_env() {
//     cout << "\n=== Текущие переменные Supabase ===\n";
//     cout << "SUPABASE_DB_POOLER = " << mask_url(env_or("SUPABASE_DB_POOLER","")) << "\n";
//     cout << "SUPABASE_DB_DIRECT = " << mask_url(env_or("SUPABASE_DB_DIRECT","")) << "\n";
// }

// static void cmd_health(bool tls) {
//     cout << "\n=== Health check ===\n";
//     psql_failover("select version(), now();");
//     if (tls) {
//         cout << "\n=== TLS check ===\n";
//         psql_failover("select current_setting('ssl') as ssl_cfg, ssl_is_used() as ssl_used;");
//     }
// }

// static void cmd_mig_status() {
//     cout << "\n=== Статус миграций ===\n";
//     string url = env_or("SUPABASE_DB_POOLER", "");
//     if (url.empty()) {
//         auto envs = choose_env();
//         url = env_or("SUPABASE_DB_POOLER", "");
//     }
//     if (url.empty()) { cout << "Пулера нет, миграции смотреть бессмысленно.\n"; return; }
//     auto r = run_cmd({"supabase", "--dns-resolver","native","migration","status","--db-url",url});
//     cout << r.out << "\n";
// }

// static void cmd_mig_up() {
//     cout << "\n=== Применение миграций ===\n";
//     string url = env_or("SUPABASE_DB_POOLER", "");
//     if (url.empty()) {
//         auto envs = choose_env();
//         url = env_or("SUPABASE_DB_POOLER", "");
//     }
//     if (url.empty()) { cout << "Пулера нет, миграции применять бессмысленно.\n"; return; }
//     auto r = run_cmd({"supabase","--dns-resolver","native","migration","up","--db-url",url});
//     cout << r.out << "\n";
// }

// static void cmd_last_logins() {
//     cout << "\n=== Последние логины в базу ===\n";
//     psql_failover("select usename, client_addr, backend_start "
//                   "from pg_stat_activity order by backend_start desc limit 5;");
// }

// static void cmd_smoke() {
//     cout << "\n=== Smoke: схема и таблицы ===\n";
//     psql_failover("select current_database(), current_user, current_schema;");
//     psql_failover("select n.nspname, c.relname from pg_class c "
//                   "join pg_namespace n on n.oid=c.relnamespace "
//                   "where relkind='r' order by 1,2 limit 10;");
// }

// static void cmd_run(bool use_direct, bool force_pooler) {
//     cout << "\n=== Выбор рабочего хоста Supabase (пулер) ===\n";
//     auto envs = choose_env(use_direct, force_pooler);
//     log_line(LogLevel::DEBUG_, string("POOLER USED: ") + mask_url(env_or("SUPABASE_DB_POOLER","")));
//     log_line(LogLevel::DEBUG_, string("DIRECT  USED: ") + mask_url(env_or("SUPABASE_DB_DIRECT","")));

//     cout << "\n=== Быстрый тест ===\n";
//     psql_failover("select version();");

//     auto pooler_shown = mask_url(env_or("SUPABASE_DB_POOLER",""));
//     cout << "\nГотово. Можно пользоваться:\n";
//     if (!pooler_shown.empty()) {
//         cout << "  psql \"" << pooler_shown << "\" -c \"select now();\"\n";
//         cout << "  supabase --dns-resolver native migration status --db-url \"" << pooler_shown << "\"\n";
//     } else {
//         auto direct = mask_url(env_or("SUPABASE_DB_DIRECT",""));
//         cout << "  psql \"" << direct << "\" -c \"select now();\"  # direct\n";
//     }
// }

// static void cmd_sql(const string& sql, const optional<string>& file) {
//     string s = sql;
//     if (file) {
//         ifstream in(*file);
//         if (!in) { cout << "Не удалось прочитать файл: " << *file << "\n"; return; }
//         s.assign((istreambuf_iterator<char>(in)), {});
//     }
//     if (s.empty() || all_of(s.begin(), s.end(), [](char c){return isspace((unsigned char)c);})){
//         cout << "Пустой SQL\n"; return;
//     }
//     psql_failover(s);
// }

// static void cmd_tls() {
//     cout << "\n=== TLS check ===\n";
//     psql_failover("select current_setting('ssl') as ssl_cfg, ssl_is_used() as ssl_used;");
// }

// static void cmd_diag() {
//     cout << "\n=== Диагностика ===\n";
//     cout << "psql: " << run_cmd({"psql","--version"}).out << "\n";
//     cout << "supabase: " << run_cmd({"supabase","--version"}).out << "\n";
//     cout << "DNS A: ";
//     {
//         auto ips = resolve_a_records(CFG.POOLER_FQDN);
//         cout << "[";
//         for (size_t i=0;i<ips.size();++i) { if (i) cout<<", "; cout<<ips[i]; }
//         cout << "]\n";
//     }
//     auto ips = resolve_a_records(CFG.POOLER_FQDN);
//     ips.insert(ips.end(), CFG.EXTRA_IPS.begin(), CFG.EXTRA_IPS.end());
//     for (auto& h: ips) {
//         bool ok = test_tcp(h, CFG.PORT_POOLER, CFG.TCP_TIMEOUT);
//         cout << "TCP " << h << ":" << CFG.PORT_POOLER << " -> " << (ok?"OK":"FAIL") << "\n";
//     }
// }

// // ================== CLI ==================

// struct Args {
//     // глобальные
//     bool use_direct=false;
//     bool force_pooler=false;
//     optional<double> tcp_timeout;
//     optional<int> max_tries;
//     optional<string> psql_bin;
//     optional<string> supabase_bin;
//     optional<string> log_level;
//     // команда
//     string cmd="run";
//     // подкоманды
//     bool health_tls=false;
//     optional<string> sql_inline;
//     optional<string> sql_file;
// };

// static void print_help() {
//     cout << "Supabase helper (C++)\n"
//          << "Глобальные опции:\n"
//          << "  --use-direct            Игнорировать пулер и использовать direct\n"
//          << "  --force-pooler          Падать, если пулер недоступен\n"
//          << "  --tcp-timeout SEC       Таймаут TCP\n"
//          << "  --max-tries N           Предел ретраев psql_failover\n"
//          << "  --psql-bin PATH         Путь к psql\n"
//          << "  --supabase-bin PATH     Путь к supabase\n"
//          << "  --log-level LEVEL       DEBUG|INFO|WARN|ERROR\n"
//          << "\nКоманды:\n"
//          << "  run                     Выбор хоста и быстрый тест\n"
//          << "  health [--tls]          Проверка версии и времени (+TLS при --tls)\n"
//          << "  show-env                Показать переменные\n"
//          << "  migrations-status       Статус миграций\n"
//          << "  migrations-up           Применить миграции\n"
//          << "  last-logins             Последние логины\n"
//          << "  smoke                   Смоук-тест схем/таблиц\n"
//          << "  sql [--sql S | --file F] Выполнить SQL\n"
//          << "  tls                     Проверка SSL/TLS\n"
//          << "  diag                    Диагностика\n";
// }

// static optional<Args> parse_args(int argc, char** argv) {
//     Args a;
//     vector<string> pos;
//     for (int i=1;i<argc;++i) {
//         string s = argv[i];
//         auto need_val = [&](optional<string>& slot){
//             if (i+1>=argc) { cerr<<"Опция "<<s<<" требует значение\n"; return false; }
//             slot = string(argv[++i]); return true;
//         };
//         if (s=="--use-direct") a.use_direct=true;
//         else if (s=="--force-pooler") a.force_pooler=true;
//         else if (s=="--tcp-timeout") {
//             if (i+1>=argc) { cerr<<"--tcp-timeout требует значение\n"; return nullopt; }
//             a.tcp_timeout = atof(argv[++i]);
//         } else if (s=="--max-tries") {
//             if (i+1>=argc) { cerr<<"--max-tries требует значение\n"; return nullopt; }
//             a.max_tries = atoi(argv[++i]);
//         } else if (s=="--psql-bin") { if (!need_val(a.psql_bin)) return nullopt; }
//         else if (s=="--supabase-bin") { if (!need_val(a.supabase_bin)) return nullopt; }
//         else if (s=="--log-level") { if (!need_val(a.log_level)) return nullopt; }
//         else if (s=="health") { a.cmd="health"; }
//         else if (s=="run") { a.cmd="run"; }
//         else if (s=="show-env") { a.cmd="show-env"; }
//         else if (s=="migrations-status") { a.cmd="migrations-status"; }
//         else if (s=="migrations-up") { a.cmd="migrations-up"; }
//         else if (s=="last-logins") { a.cmd="last-logins"; }
//         else if (s=="smoke") { a.cmd="smoke"; }
//         else if (s=="sql") { a.cmd="sql"; }
//         else if (s=="tls") { a.cmd="tls"; }
//         else if (s=="diag") { a.cmd="diag"; }
//         else if (s=="--tls") { a.health_tls = true; }
//         else if (s=="--sql") {
//             if (i+1>=argc) { cerr<<"--sql требует значение\n"; return nullopt; }
//             a.sql_inline = string(argv[++i]);
//         } else if (s=="--file") {
//             if (i+1>=argc) { cerr<<"--file требует значение\n"; return nullopt; }
//             a.sql_file = string(argv[++i]);
//         } else if (s=="-h"||s=="--help") { print_help(); exit(0); }
//         else pos.push_back(s);
//     }
//     // поддержка "по умолчанию = run" как в оригинале
//     if (a.cmd=="run" && !pos.empty()) {
//         // оставлено на случай расширений
//     }
//     return a;
// }

// // ================== MAIN ==================

// int main(int argc, char** argv) {
//     // ROOT
//     try {
//         char buf[PATH_MAX];
//         ssize_t n = readlink("/proc/self/exe", buf, sizeof(buf)-1);
//         if (n>0) { buf[n]='\0'; ROOT = fs::path(buf).parent_path(); }
//         else ROOT = fs::current_path();
//     } catch(...) { ROOT = fs::current_path(); }

//     // .env
//     string use_dotenv = env_or("USE_DOTENV","0");
//     if (str_ieq(use_dotenv, "1") || str_ieq(use_dotenv,"true")) {
//         fs::path dotenv = env_or("DOTENV_PATH", (ROOT / ".env").string());
//         load_dotenv(dotenv);
//     }

//     // CFG
//     CFG.DB_USER      = env_or("DB_USER",     "postgres.wsqhgnxmotswjantxopb");
//     CFG.DB_PASSWORD  = env_or("DB_PASSWORD", "e7TRclAGt7Yd3KEL");
//     CFG.DB_NAME      = env_or("DB_NAME",     "postgres");
//     CFG.POOLER_FQDN  = env_or("POOLER_FQDN", "aws-1-eu-central-1.pooler.supabase.com");
//     CFG.PORT_POOLER  = stoi(env_or("PORT_POOLER","6543"));
//     CFG.DIRECT_HOST  = env_or("DIRECT_HOST", "db.wsqhgnxmotswjantxopb.supabase.co");
//     CFG.PORT_DIRECT  = stoi(env_or("PORT_DIRECT","5432"));
//     CFG.TCP_TIMEOUT  = stod(env_or("TCP_TIMEOUT","1.2"));
//     CFG.PSQL_CONNSEC = stoi(env_or("PSQL_CONNSEC","3"));
//     CFG.MAX_TRIES    = stoi(env_or("MAX_TRIES","3"));
//     CFG.LOG_DIR      = fs::path(env_or("LOG_DIR",(ROOT / "logs").string()));
//     CFG.JSON_LOG     = str_ieq(env_or("JSON_LOG","1"),"1") || str_ieq(env_or("JSON_LOG","1"),"true");
//     CFG.EXTRA_IPS    = { "3.65.151.229", "3.71.225.44" };
//     CFG.PSQL_BIN     = env_or("PSQL_BIN","psql");
//     CFG.SUPABASE_BIN = env_or("SUPABASE_BIN","supabase");
//     CFG.PROM_FILE    = env_or("PROM_FILE",(ROOT / "logs" / "supabase_helper.prom").string());

//     ensure_dirs(CFG.LOG_DIR);
//     string logdate = now_date_compact();
//     LOG_TXT  = CFG.LOG_DIR / ("supabase_auto_" + logdate + ".log");
//     LOG_JSON = CFG.LOG_DIR / ("supabase_auto_" + logdate + ".jsonl");
//     PROM_PATH = CFG.PROM_FILE;
//     CACHE = ROOT / ".supabase_cache.json";

//     // парсинг аргументов
//     auto aopt = parse_args(argc, argv);
//     if (!aopt) { print_help(); return 2; }
//     auto args = *aopt;

//     if (args.psql_bin)     CFG.PSQL_BIN     = *args.psql_bin;
//     if (args.supabase_bin) CFG.SUPABASE_BIN = *args.supabase_bin;
//     if (args.tcp_timeout)  CFG.TCP_TIMEOUT  = *args.tcp_timeout;
//     if (args.max_tries)    CFG.MAX_TRIES    = *args.max_tries;
//     if (args.log_level) {
//         string s = *args.log_level;
//         if (s=="DEBUG") CONSOLE_LEVEL=LogLevel::DEBUG_;
//         else if (s=="INFO") CONSOLE_LEVEL=LogLevel::INFO;
//         else if (s=="WARN") CONSOLE_LEVEL=LogLevel::WARN;
//         else if (s=="ERROR") CONSOLE_LEVEL=LogLevel::ERROR_;
//     }

//     // ensure tools
//     auto psql_ver = run_cmd({"psql","--version"});
//     if (psql_ver.code != 0) {
//         log_line(LogLevel::ERROR_, "Не найдено или не запускается: psql. Добавь в PATH. Вывод: " + psql_ver.out);
//         cerr << color("Ошибка: psql не найден", "31") << "\n";
//         return 1;
//     }
//     auto sup_ver = run_cmd({"supabase","--version"});
//     if (sup_ver.code != 0) {
//         log_line(LogLevel::WARN, "supabase CLI не найден. Команды миграций работать не будут.");
//     }

//     // по умолчанию = run (как в оригинале)
//     if (args.cmd=="run" && argc==1) {
//         // уважаем --use-direct/--force-pooler, если были; у нас argc==1, но не страшно
//     }

//     try {
//         if (args.cmd=="run") cmd_run(args.use_direct, args.force_pooler);
//         else if (args.cmd=="health") cmd_health(args.health_tls);
//         else if (args.cmd=="show-env") cmd_show_env();
//         else if (args.cmd=="migrations-status") cmd_mig_status();
//         else if (args.cmd=="migrations-up") cmd_mig_up();
//         else if (args.cmd=="last-logins") cmd_last_logins();
//         else if (args.cmd=="smoke") cmd_smoke();
//         else if (args.cmd=="sql") cmd_sql(args.sql_inline.value_or(""), args.sql_file);
//         else if (args.cmd=="tls") cmd_tls();
//         else if (args.cmd=="diag") cmd_diag();
//         else { print_help(); return 2; }
//     } catch (const exception& e) {
//         log_line(LogLevel::ERROR_, string("Фатальная ошибка: ")+e.what());
//         cerr << color(string("Ошибка: ")+e.what(), "31") << "\n";
//         return 1;
//     }

//     return 0;
// }