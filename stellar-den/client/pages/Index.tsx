import { useState } from "react";
import { Search, X, ChevronDown, Settings } from "lucide-react";

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("ecommerce ui ux website design");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("projects");
  const [selectedSort, setSelectedSort] = useState("recommended");

  const sortOptions = [
    { value: "recommended", label: "Рекомендуемые" },
    { value: "featured", label: "Модерируемые" },
    { value: "appreciations", label: "С высшими оценками" },
    { value: "views", label: "Самые популярные" },
    { value: "comments", label: "Самые обсуждаемые" },
    { value: "recent", label: "Самые недавние" },
  ];

  const tabs = [
    { id: "projects", label: "Проекты" },
    { id: "people", label: "Люди" },
    { id: "resources", label: "Ресурсы" },
    { id: "images", label: "Изображения" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-6">
          {/* Top Row: Filter and Search */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-700 font-medium text-sm"
            >
              <Settings size={18} className="text-gray-600" />
              <span>Фильтр</span>
            </button>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-gray-600" />
                <input
                  type="search"
                  placeholder="Поиск по Behance…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-full bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Navigation Tabs and Sort */}
          <div className="flex items-center justify-between">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`px-4 h-9 rounded-full text-sm font-medium transition-colors ${
                    selectedTab === tab.id
                      ? "bg-white border border-gray-300 text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="inline-flex items-center gap-2 text-gray-700 text-sm font-medium hover:text-gray-900 transition-colors"
              >
                <svg
                  width="20"
                  height="14"
                  viewBox="0 0 20 14"
                  fill="currentColor"
                  className="text-gray-600"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M1.098.36A.66.66 0 0 0 .64.713a.66.66 0 0 0 .002.527.61.61 0 0 0 .48.36c.18.028 17.578.028 17.758-.001a.62.62 0 0 0 .478-.359.5.5 0 0 0 .051-.27c0-.134-.009-.177-.054-.264a.68.68 0 0 0-.315-.304L18.93.35 10.06.347C5.181.346 1.149.352 1.098.36M2.91 4.388a.64.64 0 0 0-.393.332c-.066.127-.068.43-.003.551a.8.8 0 0 0 .302.293l.094.046h14.18l.095-.046a.62.62 0 0 0 .352-.604.62.62 0 0 0-.365-.544l-.102-.046-7.04-.004c-5.638-.003-7.056.002-7.12.022M4.734 8.42a.6.6 0 0 0-.304.247.622.622 0 0 0 .268.91l.112.053h10.38l.112-.052a.623.623 0 0 0 .268-.911.6.6 0 0 0-.31-.248c-.098-.038-.213-.039-5.265-.038-5.005.001-5.168.002-5.261.039m2.605 3.98a.63.63 0 0 0-.518.735c.029.142.06.204.153.307.097.107.211.17.355.197.167.03 5.178.03 5.342 0a.53.53 0 0 0 .311-.153c.166-.15.24-.37.197-.58a.62.62 0 0 0-.369-.46l-.12-.056-2.63-.003c-1.447-.001-2.671.004-2.721.013"
                  />
                </svg>
                <span>{sortOptions.find(o => o.value === selectedSort)?.label}</span>
                <ChevronDown
                  size={14}
                  className="text-gray-600 transition-transform"
                  style={{ transform: sortOpen ? "rotate(180deg)" : "rotate(0)" }}
                />
              </button>

              {/* Sort Dropdown Menu */}
              {sortOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-md z-50 py-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedSort(option.value);
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2 text-sm transition-colors flex items-center justify-between ${
                        selectedSort === option.value
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>{option.label}</span>
                      {selectedSort === option.value && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="text-blue-600"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex">
        {/* Sidebar - Shown when filter is open */}
        {filterOpen && (
          <div className="w-64 border-r border-gray-200 bg-gray-50 min-h-screen p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Фильтры</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категория
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option>Все категории</option>
                  <option>UI Design</option>
                  <option>UX Design</option>
                  <option>Web Design</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Время
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option>За все время</option>
                  <option>За месяц</option>
                  <option>За неделю</option>
                  <option>За день</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Добро пожаловать!
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              Используйте поиск и фильтры выше, чтобы найти вдохновляющие проекты и работы дизайнеров
            </p>
          </div>

          {/* Results Grid - Placeholder */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-gray-100 rounded-lg h-64 flex items-center justify-center text-gray-500"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-4"></div>
                  <p>Проект {i}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
