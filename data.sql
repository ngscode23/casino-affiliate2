--
-- PostgreSQL database dump
--

\restrict Ax38oSUZMXC09tLiJoWlhdMzRNi0uHi7ugu9X2gOUngawb98gmfA8hZRBPdSbSM

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Brand; Type: TABLE DATA; Schema: discounts; Owner: -
--

COPY discounts."Brand" (id, name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: discounts; Owner: -
--

COPY discounts."Category" (id, name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Coupon; Type: TABLE DATA; Schema: discounts; Owner: -
--

COPY discounts."Coupon" (id, code, "discountId", "maxRedemptions", redemptions, metadata, "startsAt", "endsAt") FROM stdin;
\.


--
-- Data for Name: CouponRedemption; Type: TABLE DATA; Schema: discounts; Owner: -
--

COPY discounts."CouponRedemption" (id, "couponId", "discountId", "userId", "orderId", "amountCents", currency, "redeemedAt", metadata) FROM stdin;
\.


--
-- Data for Name: Discount; Type: TABLE DATA; Schema: discounts; Owner: -
--

COPY discounts."Discount" (id, name, type, description, "percentOff", "amountOffCts", currency, "bogoBuyQty", "bogoGetQty", stackable, priority, "minSubtotalCts", "minQty", "startAt", "endAt", channel, "usageLimitTotal", "usageLimitPerUser", active, "createdAt", "updatedAt") FROM stdin;
027fad10-6ad3-4c1d-bb49-1e4a849e5710	15% на iPhone	percent_off		0.2000	\N	\N	\N	\N	f	100	\N	\N	2025-11-05 14:53:02	2025-11-06 00:00:00	all	\N	\N	t	2025-11-05 14:58:25.85	2025-11-05 21:30:40.12
\.


--
-- Data for Name: DiscountAssignment; Type: TABLE DATA; Schema: discounts; Owner: -
--

COPY discounts."DiscountAssignment" (id, "discountId", scope, "refId") FROM stdin;
07758da6-c868-4f91-ab80-c8f7452b77a2	027fad10-6ad3-4c1d-bb49-1e4a849e5710	PRODUCT	147daaf1-9a9d-46a0-bca4-8b84076ee149
3da9f413-5155-4979-9653-ccdc1a85f582	027fad10-6ad3-4c1d-bb49-1e4a849e5710	PRODUCT	86a59b18-a8e2-4fb7-ab0f-168a215cdec6
\.


--
-- Data for Name: DiscountExclusion; Type: TABLE DATA; Schema: discounts; Owner: -
--

COPY discounts."DiscountExclusion" (id, "discountId", scope, "refId") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: discounts; Owner: -
--

COPY discounts."Product" (id, sku, name, "brandId", "vendorId", "categoryId", "priceCents", currency, "createdAt", "updatedAt") FROM stdin;
b351f0b3-1891-4ac5-b7c7-15ada3449d00	DEMO-001	Demo Product	\N	\N	\N	999	EUR	2025-11-05 13:54:37.59	2025-11-05 13:54:37.59
\.


--
-- Data for Name: Vendor; Type: TABLE DATA; Schema: discounts; Owner: -
--

COPY discounts."Vendor" (id, name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ab_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ab_events (id, created_at, ts, test, variant, event, href, props) FROM stdin;
\.


--
-- Data for Name: admin_emails; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_emails (email) FROM stdin;
stasvolohovish@gmail.com
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_settings (key, value, updated_at) FROM stdin;
setup.v1	{"brandName":"","contactEmail":"","logoLightUrl":"","logoDarkUrl":"","payoutProvider":"","payoutCurrency":"EUR","payoutThreshold":null,"payoutWebhookUrl":"","trackingToken":"d032f65927a94838a8dfe345","postbackUrl":"","googleAnalytics":false,"termsUrl":"","privacyUrl":"","responsibleUrl":"","cookieUrl":"","notificationsEmail":true,"notificationsSlack":true,"slackWebhookUrl":"","pendingInvites":[],"customSteps":[]}	2025-11-01 20:54:15.864548+00
\.


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group (id, name) FROM stdin;
1	1
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	permission
3	auth	group
4	auth	user
5	contenttypes	contenttype
6	sessions	session
7	discounts_admin	brand
8	discounts_admin	vendor
9	discounts_admin	category
10	discounts_admin	product
11	discounts_admin	discount
12	discounts_admin	discountassignment
13	discounts_admin	discountexclusion
14	discounts_admin	coupon
15	discounts_admin	couponredemption
16	discounts_admin	catalogproduct
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	2	add_permission
6	Can change permission	2	change_permission
7	Can delete permission	2	delete_permission
8	Can view permission	2	view_permission
9	Can add group	3	add_group
10	Can change group	3	change_group
11	Can delete group	3	delete_group
12	Can view group	3	view_group
13	Can add user	4	add_user
14	Can change user	4	change_user
15	Can delete user	4	delete_user
16	Can view user	4	view_user
17	Can add content type	5	add_contenttype
18	Can change content type	5	change_contenttype
19	Can delete content type	5	delete_contenttype
20	Can view content type	5	view_contenttype
21	Can add session	6	add_session
22	Can change session	6	change_session
23	Can delete session	6	delete_session
24	Can view session	6	view_session
25	Can add brand	7	add_brand
26	Can change brand	7	change_brand
27	Can delete brand	7	delete_brand
28	Can view brand	7	view_brand
29	Can add vendor	8	add_vendor
30	Can change vendor	8	change_vendor
31	Can delete vendor	8	delete_vendor
32	Can view vendor	8	view_vendor
33	Can add category	9	add_category
34	Can change category	9	change_category
35	Can delete category	9	delete_category
36	Can view category	9	view_category
37	Can add product	10	add_product
38	Can change product	10	change_product
39	Can delete product	10	delete_product
40	Can view product	10	view_product
41	Can add discount	11	add_discount
42	Can change discount	11	change_discount
43	Can delete discount	11	delete_discount
44	Can view discount	11	view_discount
45	Can add discount assignment	12	add_discountassignment
46	Can change discount assignment	12	change_discountassignment
47	Can delete discount assignment	12	delete_discountassignment
48	Can view discount assignment	12	view_discountassignment
49	Can add discount exclusion	13	add_discountexclusion
50	Can change discount exclusion	13	change_discountexclusion
51	Can delete discount exclusion	13	delete_discountexclusion
52	Can view discount exclusion	13	view_discountexclusion
53	Can add coupon	14	add_coupon
54	Can change coupon	14	change_coupon
55	Can delete coupon	14	delete_coupon
56	Can view coupon	14	view_coupon
57	Can add coupon redemption	15	add_couponredemption
58	Can change coupon redemption	15	change_couponredemption
59	Can delete coupon redemption	15	delete_couponredemption
60	Can view coupon redemption	15	view_couponredemption
61	Can add catalog product	16	add_catalogproduct
62	Can change catalog product	16	change_catalogproduct
63	Can delete catalog product	16	delete_catalogproduct
64	Can view catalog product	16	view_catalogproduct
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_roles (role, description) FROM stdin;
admin	Full administrative access
manager	Extended back-office access
user	Default application user
\.


--
-- Data for Name: auth_user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_user (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined) FROM stdin;
1	pbkdf2_sha256$1000000$WVn0iH12CK4xz6yxRAJEi6$Aw3q8B0i3SroKpvjHPoJfcRLyjzyF4btc3ERQBeh8uY=	2025-11-05 20:14:14.834092+00	t	stasv			stasvolohovish@gmail.com	t	t	2025-11-05 13:01:37.12041+00
\.


--
-- Data for Name: auth_user_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_user_groups (id, user_id, group_id) FROM stdin;
\.


--
-- Data for Name: auth_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_user_user_permissions (id, user_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_users (id, email, password_hash, role, created_at, is_active, metadata, last_login_at, password_updated_at, token_version, updated_at) FROM stdin;
054256df-38e6-4778-938b-126def8c7c4b	stasvolohovish@gmail.com	$2a$12$blYLZDl407J4vNaGbkRrheDJVIaY7jo8ZA8YvaCxK8SE0zfiCy0ua	admin	2025-09-17 14:07:04.461329+00	t	{}	2025-09-17 19:40:02.483+00	2025-09-17 17:15:36.994+00	1	2025-09-17 19:40:02.48481+00
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banners (id, title, subtitle, image_url, href, priority, active_from, active_to, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.carts (id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: catalog_published; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.catalog_published (id, slug, title, price, rating, category_slug, created_at, thumbnail_path) FROM stdin;
147daaf1-9a9d-46a0-bca4-8b84076ee149	iphone17-pro1	Iphone 17 Pro	1230.00	5	electronics	2025-11-01 16:53:37.032699+00	sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg
86a59b18-a8e2-4fb7-ab0f-168a215cdec6	iphone17-pro1-copy	Iphone 17 Pro	1230.00	5	electronics	2025-11-04 13:04:13.643+00	sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg
\.


--
-- Data for Name: cms_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cms_roles (user_id, role, created_at, created_by) FROM stdin;
db93c961-5f77-41d3-96d2-9b50eaabb3ab	admin	2025-11-02 16:18:18.176098+00	\N
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contact_messages (id, full_name, email, message, created_at, metadata) FROM stdin;
\.


--
-- Data for Name: content_blocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.content_blocks (id, locale, type, slug, status, content_json, published_at, created_at, created_by, updated_at, updated_by) FROM stdin;
7f6bd9f2-97fb-42bd-81c7-73c74ade5bf7	ru	rich_text	welcome	published	{"html": "<p>Привет</p>"}	\N	2025-11-02 16:36:17.377522+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 16:36:17.377522+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab
debf67bc-0927-45f8-9aff-ff42752f2ad1	en	hero	\N	published	{"cta": {"href": "/offers", "label": "Browse offers"}, "title": "Start winning with Casino Affiliate", "features": [{"icon": "gift", "label": "Exclusive bonuses"}, {"icon": "clock", "label": "Hourly updates"}, {"icon": "shield", "label": "Trusted partners"}], "subtitle": "Hand-picked bonus offers and real-time odds in one dashboard.", "backgroundImage": {"alt": "Casino chips and cards on a table", "path": "hero/landing-bg.jpg", "bucket": "media"}}	2025-11-02 20:48:40.847+00	2025-11-02 20:48:41.106491+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 20:48:41.106491+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab
\.


--
-- Data for Name: content_revisions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.content_revisions (id, target_table, target_id, target_key, locale, snapshot, author, created_at, message) FROM stdin;
87268f57-5201-4260-9634-c0913b2674ce	site_settings	\N	header.title	ru	{"op": "INSERT", "new": {"key": "header.title", "locale": "ru", "is_public": true, "updated_at": "2025-11-02T16:35:29.362123+00:00", "updated_by": null, "value_json": {"text": "Магазин"}}}	\N	2025-11-02 16:35:29.362123+00	\N
91c86384-ce6d-4cf4-9036-95024656c610	site_settings	\N	header.title	ru	{"op": "UPDATE", "new": {"key": "header.title", "locale": "ru", "is_public": true, "updated_at": "2025-11-02T16:35:39.051904+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": {"text": "Магазин"}}, "old": {"key": "header.title", "locale": "ru", "is_public": true, "updated_at": "2025-11-02T16:35:29.362123+00:00", "updated_by": null, "value_json": {"text": "Магазин"}}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 16:35:39.051904+00	\N
eb7d78d7-01d2-4a00-94e0-2f234d2cb636	content_blocks	7f6bd9f2-97fb-42bd-81c7-73c74ade5bf7	\N	ru	{"op": "INSERT", "new": {"id": "7f6bd9f2-97fb-42bd-81c7-73c74ade5bf7", "slug": "welcome", "type": "rich_text", "locale": "ru", "status": "published", "created_at": "2025-11-02T16:36:17.377522+00:00", "created_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "updated_at": "2025-11-02T16:36:17.377522+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "content_json": {"html": "<p>Привет</p>"}, "published_at": null}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 16:36:17.377522+00	\N
7259ea51-6e6b-40ad-b60d-d7c5c801dd90	page_sections	6fc8392c-efaf-476e-9276-554855bc9ed6	\N	ru	{"op": "INSERT", "new": {"id": "6fc8392c-efaf-476e-9276-554855bc9ed6", "locale": "ru", "visible": true, "block_id": "7f6bd9f2-97fb-42bd-81c7-73c74ade5bf7", "is_draft": false, "page_path": "/", "created_at": "2025-11-02T16:37:32.587113+00:00", "created_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "sort_order": 0, "updated_at": "2025-11-02T16:37:32.587113+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "published_at": "2025-11-02T16:37:32.587113+00:00"}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 16:37:32.587113+00	\N
9aaea5b2-90bd-40b9-9f3d-8ff89ff9610b	site_settings	\N	header.title	ru	{"op": "DELETE", "old": {"key": "header.title", "locale": "ru", "is_public": true, "updated_at": "2025-11-02T16:35:39.051904+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": {"text": "Магазин"}}}	\N	2025-11-02 17:24:49.315741+00	\N
42792e55-5ad7-4fce-b549-4da58694a770	site_settings	\N	debug.test	en	{"op": "INSERT", "new": {"key": "debug.test", "locale": "en", "is_public": true, "updated_at": "2025-11-02T18:34:44.414989+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": "ok"}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 18:34:44.414989+00	\N
88c0f54f-2fa2-4c4d-a9ae-96f5e242a251	site_settings	\N	header.title	ru	{"op": "INSERT", "new": {"key": "header.title", "locale": "ru", "is_public": true, "updated_at": "2025-11-02T18:41:09.865131+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": {"text": "Магазин"}}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 18:41:09.865131+00	\N
90795182-b91d-47d5-b786-662308aaf5d0	site_settings	\N	header.title	ru	{"op": "UPDATE", "new": {"key": "header.title", "locale": "ru", "is_public": true, "updated_at": "2025-11-02T18:41:15.321871+00:00", "updated_by": null, "value_json": {"text": "Магазин"}}, "old": {"key": "header.title", "locale": "ru", "is_public": true, "updated_at": "2025-11-02T18:41:09.865131+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": {"text": "Магазин"}}}	\N	2025-11-02 18:41:15.321871+00	\N
04666b35-2175-4e35-a793-24fded75d65f	site_settings	\N	debug.test	en	{"op": "UPDATE", "new": {"key": "debug.test", "locale": "en", "is_public": true, "updated_at": "2025-11-02T18:55:20.762749+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": "ok"}, "old": {"key": "debug.test", "locale": "en", "is_public": true, "updated_at": "2025-11-02T18:34:44.414989+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": "ok"}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 18:55:20.762749+00	\N
91d98f02-9cd0-41e5-9f04-dcefdc7cf1ac	site_settings	\N	debug.test	en	{"op": "UPDATE", "new": {"key": "debug.test", "locale": "en", "is_public": true, "updated_at": "2025-11-02T18:55:28.398774+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": "ok"}, "old": {"key": "debug.test", "locale": "en", "is_public": true, "updated_at": "2025-11-02T18:55:20.762749+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": "ok"}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 18:55:28.398774+00	\N
ea4a4b90-fa62-4cb5-929f-4bd92c57e437	site_settings	\N	debug.test	en	{"op": "UPDATE", "new": {"key": "debug.test", "locale": "en", "is_public": true, "updated_at": "2025-11-02T19:12:06.609739+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": "ok"}, "old": {"key": "debug.test", "locale": "en", "is_public": true, "updated_at": "2025-11-02T18:55:28.398774+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": "ok"}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 19:12:06.609739+00	\N
6f2b9732-98bf-4ac8-8747-ead28068e8d9	site_settings	\N	debug.test	en	{"op": "UPDATE", "new": {"key": "debug.test", "locale": "en", "is_public": true, "updated_at": "2025-11-02T19:25:42.737714+00:00", "updated_by": null, "value_json": {"test": "ok"}}, "old": {"key": "debug.test", "locale": "en", "is_public": true, "updated_at": "2025-11-02T19:12:06.609739+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": "ok"}}	\N	2025-11-02 19:25:42.737714+00	\N
a0626295-e086-4b13-92f9-2fd223f8a6e3	site_settings	\N	header.title	ru	{"op": "DELETE", "old": {"key": "header.title", "locale": "ru", "is_public": true, "updated_at": "2025-11-02T18:41:15.321871+00:00", "updated_by": null, "value_json": {"text": "Магазин"}}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 19:55:29.358312+00	\N
cfe4a9ce-23bc-4a64-854e-3e5a0c740998	site_settings	\N	1	en	{"op": "INSERT", "new": {"key": "1", "locale": "en", "is_public": true, "updated_at": "2025-11-02T20:27:46.295147+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": ""}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 20:27:46.295147+00	\N
7a4af7a8-ab20-4f77-b477-44addd3ca77a	site_settings	\N	1	ru	{"op": "INSERT", "new": {"key": "1", "locale": "ru", "is_public": true, "updated_at": "2025-11-02T20:33:13.407465+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "value_json": ""}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 20:33:13.407465+00	\N
bb5d0a54-cf8f-48b6-ad1a-baa2900443b8	content_blocks	debf67bc-0927-45f8-9aff-ff42752f2ad1	\N	en	{"op": "INSERT", "new": {"id": "debf67bc-0927-45f8-9aff-ff42752f2ad1", "slug": null, "type": "hero", "locale": "en", "status": "published", "created_at": "2025-11-02T20:48:41.106491+00:00", "created_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "updated_at": "2025-11-02T20:48:41.106491+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "content_json": {"cta": {"href": "/offers", "label": "Browse offers"}, "title": "Start winning with Casino Affiliate", "features": [{"icon": "gift", "label": "Exclusive bonuses"}, {"icon": "clock", "label": "Hourly updates"}, {"icon": "shield", "label": "Trusted partners"}], "subtitle": "Hand-picked bonus offers and real-time odds in one dashboard.", "backgroundImage": {"alt": "Casino chips and cards on a table", "path": "hero/landing-bg.jpg", "bucket": "media"}}, "published_at": null}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 20:48:41.106491+00	\N
1fe2062a-cbbc-4451-8568-cc22042773d8	content_blocks	debf67bc-0927-45f8-9aff-ff42752f2ad1	\N	en	{"op": "UPDATE", "new": {"id": "debf67bc-0927-45f8-9aff-ff42752f2ad1", "slug": null, "type": "hero", "locale": "en", "status": "published", "created_at": "2025-11-02T20:48:41.106491+00:00", "created_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "updated_at": "2025-11-02T20:48:41.106491+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "content_json": {"cta": {"href": "/offers", "label": "Browse offers"}, "title": "Start winning with Casino Affiliate", "features": [{"icon": "gift", "label": "Exclusive bonuses"}, {"icon": "clock", "label": "Hourly updates"}, {"icon": "shield", "label": "Trusted partners"}], "subtitle": "Hand-picked bonus offers and real-time odds in one dashboard.", "backgroundImage": {"alt": "Casino chips and cards on a table", "path": "hero/landing-bg.jpg", "bucket": "media"}}, "published_at": "2025-11-02T20:48:40.847+00:00"}, "old": {"id": "debf67bc-0927-45f8-9aff-ff42752f2ad1", "slug": null, "type": "hero", "locale": "en", "status": "published", "created_at": "2025-11-02T20:48:41.106491+00:00", "created_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "updated_at": "2025-11-02T20:48:41.106491+00:00", "updated_by": "db93c961-5f77-41d3-96d2-9b50eaabb3ab", "content_json": {"cta": {"href": "/offers", "label": "Browse offers"}, "title": "Start winning with Casino Affiliate", "features": [{"icon": "gift", "label": "Exclusive bonuses"}, {"icon": "clock", "label": "Hourly updates"}, {"icon": "shield", "label": "Trusted partners"}], "subtitle": "Hand-picked bonus offers and real-time odds in one dashboard.", "backgroundImage": {"alt": "Casino chips and cards on a table", "path": "hero/landing-bg.jpg", "bucket": "media"}}, "published_at": null}}	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 20:48:41.981708+00	\N
\.


--
-- Data for Name: currencies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.currencies (code, minor_unit) FROM stdin;
USD	2
EUR	2
GBP	2
JPY	0
KWD	3
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
1	2025-11-05 13:22:43.562403+00	1	1	1	[{"added": {}}]	3	1
2	2025-11-05 14:58:25.896062+00	027fad10-6ad3-4c1d-bb49-1e4a849e5710	15% на iPhone	1	[{"added": {}}, {"added": {"name": "discount assignment", "object": "Assignment PRODUCT:SKU-MHGIL7NQ-A29GZI"}}]	11	1
3	2025-11-05 15:46:20.787755+00	027fad10-6ad3-4c1d-bb49-1e4a849e5710	15% на iPhone	2	[{"changed": {"name": "discount assignment", "object": "Assignment PRODUCT:147daaf1-9a9d-46a0-bca4-8b84076ee149", "fields": ["Ref id"]}}]	11	1
4	2025-11-05 15:48:13.069981+00	027fad10-6ad3-4c1d-bb49-1e4a849e5710	15% на iPhone	2	[]	11	1
5	2025-11-05 16:03:46.621259+00	027fad10-6ad3-4c1d-bb49-1e4a849e5710	15% на iPhone	2	[]	11	1
6	2025-11-05 20:14:29.921837+00	027fad10-6ad3-4c1d-bb49-1e4a849e5710	15% на iPhone	2	[{"changed": {"fields": ["Percent off"]}}]	11	1
7	2025-11-05 21:25:51.965935+00	027fad10-6ad3-4c1d-bb49-1e4a849e5710	15% на iPhone	2	[{"added": {"name": "discount assignment", "object": "Assignment PRODUCT:86a59b18-a8e2-4fb7-ab0f-168a215cdec6"}}]	11	1
8	2025-11-05 21:27:06.583423+00	027fad10-6ad3-4c1d-bb49-1e4a849e5710	15% на iPhone	2	[]	11	1
9	2025-11-05 21:30:40.207345+00	027fad10-6ad3-4c1d-bb49-1e4a849e5710	15% на iPhone	2	[]	11	1
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2025-11-05 13:00:24.547785+00
2	auth	0001_initial	2025-11-05 13:00:25.106759+00
3	admin	0001_initial	2025-11-05 13:00:25.240399+00
4	admin	0002_logentry_remove_auto_add	2025-11-05 13:00:25.270868+00
5	admin	0003_logentry_add_action_flag_choices	2025-11-05 13:00:25.340213+00
6	contenttypes	0002_remove_content_type_name	2025-11-05 13:00:25.466973+00
7	auth	0002_alter_permission_name_max_length	2025-11-05 13:00:25.56872+00
8	auth	0003_alter_user_email_max_length	2025-11-05 13:00:25.677754+00
9	auth	0004_alter_user_username_opts	2025-11-05 13:00:25.750057+00
10	auth	0005_alter_user_last_login_null	2025-11-05 13:00:25.837568+00
11	auth	0006_require_contenttypes_0002	2025-11-05 13:00:25.876984+00
12	auth	0007_alter_validators_add_error_messages	2025-11-05 13:00:25.947848+00
13	auth	0008_alter_user_username_max_length	2025-11-05 13:00:26.032877+00
14	auth	0009_alter_user_last_name_max_length	2025-11-05 13:00:26.112865+00
15	auth	0010_alter_group_name_max_length	2025-11-05 13:00:26.198512+00
16	auth	0011_update_proxy_permissions	2025-11-05 13:00:26.237487+00
17	auth	0012_alter_user_first_name_max_length	2025-11-05 13:00:26.320254+00
18	sessions	0001_initial	2025-11-05 13:00:26.456563+00
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
6hxzg54kj7p3c9ttovsfdjnafns4yjtl	.eJxVjMsOwiAQRf-FtSEMtjxcuu83EIYZpGogKe3K-O_apAvd3nPOfYkQt7WErfMSZhIXAeL0u2FMD647oHustyZTq-syo9wVedAup0b8vB7u30GJvXxr1kDORWavY4bRDJx1TjajGs6MoDyxMWQTZtSJYESjgL31LmmETEa8Pw1KOPY:1vGjtW:ootmIP0E6U3WQA4etW1aoknHVTVu-alpVhGuicc21FE	2025-11-19 20:14:14.860737+00
\.


--
-- Data for Name: ecom_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ecom_categories (id, slug, name, icon, created_at) FROM stdin;
5fd82e57-f913-4585-a411-36ff71687849	electronics	Электроника	bolt	2025-11-01 16:48:42.097991+00
c6c8f907-97c9-4a10-9404-60cf9c6563e2	fashion	Одежда	tshirt	2025-11-01 16:48:42.097991+00
a8519d57-71e0-4c66-999c-e2f4c98da9c7	home	Дом и кухня	home	2025-11-01 16:48:42.097991+00
ad4881ef-c2b1-468d-bd7c-925b2b5f70e0	sports	Спорт и отдых	ball	2025-11-01 16:48:42.097991+00
bc54cdea-0c7d-4ace-bbc0-f68bd22df3e0	beauty	Красота и здоровье	sparkles	2025-11-01 16:48:42.097991+00
66a344d4-6c24-4324-b4f9-66ea08d59ec5	toys	Детям и игрушки	toy	2025-11-01 16:48:42.097991+00
\.


--
-- Data for Name: ecom_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ecom_products (id, slug, title, price, rating, images, category_slug, tags, short_desc, specs, created_at, status, sku, image_path, currency, seller_id, to_delete, deleted_at, description, main_image_url, price_cents) FROM stdin;
86a59b18-a8e2-4fb7-ab0f-168a215cdec6	iphone17-pro1-copy	Iphone 17 Pro	1230.00	5	["https://wsqhgnxmotswjantxopb.supabase.co/storage/v1/object/public/product-images/sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg"]	electronics	{}		{}	2025-11-04 13:04:13.643+00	published	SKU-MHGIL7NQ-A29GZI-COPY	\N	\N	\N	\N	\N		sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg	123000
147daaf1-9a9d-46a0-bca4-8b84076ee149	iphone17-pro1	Iphone 17 Pro	1230.00	5	["https://wsqhgnxmotswjantxopb.supabase.co/storage/v1/object/public/product-images/sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg"]	electronics	{}		{}	2025-11-01 16:53:37.032699+00	published	SKU-MHGIL7NQ-A29GZI	sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg	\N	\N	f	\N	\N	\N	\N
\.


--
-- Data for Name: ecom_product_image_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ecom_product_image_versions (id, product_id, sku, path, uploaded_at, uploaded_by, is_current, source_url, metadata, uploaded_via) FROM stdin;
2b54b32c-9983-40f5-866c-b770290400d9	147daaf1-9a9d-46a0-bca4-8b84076ee149	SKU-MHGIL7NQ-A29GZI	sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg	2025-11-01 16:48:29.824586+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab	t	https://wsqhgnxmotswjantxopb.supabase.co/storage/v1/object/public/product-images/sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg	\N	\N
60734178-0c77-409a-bde3-a5af779fbf26	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	SKU-MHGIL7NQ-A29GZI-COPY	sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg	2025-11-04 13:04:14.351054+00	\N	t	https://wsqhgnxmotswjantxopb.supabase.co/storage/v1/object/public/product-images/sku-mhgil7nq-a29gzi/main-1762015708278-4nxgse.jpg	\N	\N
\.


--
-- Data for Name: ecom_wishlist; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ecom_wishlist (user_id, product_id, created_at) FROM stdin;
\.


--
-- Data for Name: feature_toggles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feature_toggles (key, description, value_bool, value_json, is_public, starts_at, ends_at, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: form_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.form_templates (id, slug, title, schema_json, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: form_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.form_entries (id, form_id, locale, submitted_at, submitted_by, data, status) FROM stdin;
\.


--
-- Data for Name: job_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_runs (id, jobname, status, response, ran_at) FROM stdin;
\.


--
-- Data for Name: line_total_is_generated; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.line_total_is_generated ("coalesce", id) FROM stdin;
\.


--
-- Data for Name: media_assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_assets (id, bucket, storage_key, mime_type, width, height, size_bytes, alt, description, uploaded_by, created_at, checksum) FROM stdin;
\.


--
-- Data for Name: navigation_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.navigation_links (id, locale, menu, label, url, sort_order, published, is_external, parent_id, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: offer_clicks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.offer_clicks (id, slug, click_id, target_url, target_url_final, target_host, params, referrer, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, status, subtotal, discount_total, shipping_total, grand_total, currency, created_at, paid_at, cancelled_at, checkout_metadata, amount_cents, payment_intent_id, payment_status, applied_promotions, coupon_codes) FROM stdin;
8593f09b-b0d7-4d6f-9285-02928b9c7d98	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 17:32:29.400545+00	\N	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOifJDUDlhUOPHH0xCKpHkf	failed	[]	{}
a0f08f0c-9d75-4923-a6e1-c92dfc079af6	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 20:01:39.802262+00	\N	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOkzZDUDlhUOPHH2f5vmHgK	failed	[]	{}
af21e154-c0ab-497a-8297-e7ea44743a1d	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 19:14:04.678607+00	\N	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOkFWDUDlhUOPHH1fmAawWs	failed	[]	{}
79b412de-67f6-4740-9d97-c3fecb4b553f	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 19:16:28.488856+00	\N	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOkHqDUDlhUOPHH181fBpeu	failed	[]	{}
755df648-772f-4fd1-8a91-a082f123b62c	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 19:44:23.153786+00	2025-11-01 19:44:25+00	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOkirDUDlhUOPHH1zw7kEym	succeeded	[]	{}
de90158d-b70b-4ffa-a5a7-3c3a7232279e	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 19:26:17.392659+00	\N	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOkRLDUDlhUOPHH1wGILEUb	failed	[]	{}
e60fd539-3137-43f6-8698-4835528ae322	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 19:35:04.497061+00	\N	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOkZrDUDlhUOPHH1Pj41Vfq	succeeded	[]	{}
596b2f24-28e0-48c8-a12d-4ad883b3d898	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 20:04:15.488672+00	2025-11-01 20:04:17+00	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOl25DUDlhUOPHH3hmckuN6	succeeded	[]	{}
9bc5192b-899c-410a-b658-9fd383375382	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 20:17:00.099051+00	2025-11-01 20:17:01+00	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOlEPDUDlhUOPHH3GztTX7l	succeeded	[]	{}
93440a7a-b7b0-4d6a-80a2-470e9c4b1629	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 21:33:31.978064+00	\N	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOmQTDUDlhUOPHH27B9f88K	failed	[]	{}
3aec1e48-ab52-4482-9d44-18d605c90aeb	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 21:36:01.245457+00	\N	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOmSsDUDlhUOPHH14TS6p3S	failed	[]	{}
365c7efd-a57a-479e-a5ed-a321c164eee7	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	1230.00	0.00	0.00	1230.00	EUR	2025-11-01 22:09:02.18534+00	2025-11-01 22:09:03+00	\N	{"contact": {"email": "stasvolohovish@gmail.com", "fullName": "Stanislav Volockhovych"}, "shipping": {"city": "Trier", "address": "Normannenstraße", "postalCode": "54293"}}	123000	pi_3SOmypDUDlhUOPHH0ZvRgfkM	succeeded	[]	{}
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, variant_id, title, qty, unit_price, meta) FROM stdin;
7c5ecb7f-d457-4418-b090-bda479db8524	8593f09b-b0d7-4d6f-9285-02928b9c7d98	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
d3467f07-8a45-4b09-ad1e-bb3566f196ca	af21e154-c0ab-497a-8297-e7ea44743a1d	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
54f0f95d-9341-447c-a5ea-b20f06701c07	79b412de-67f6-4740-9d97-c3fecb4b553f	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
607f55d0-d889-4fb2-88e3-7e415a781be2	de90158d-b70b-4ffa-a5a7-3c3a7232279e	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
b8d45228-07c2-4640-81f7-5c708eb6b434	e60fd539-3137-43f6-8698-4835528ae322	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
4e19dc2e-3784-4b72-b2ba-1f1586c4a7e8	755df648-772f-4fd1-8a91-a082f123b62c	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
6920a807-4401-4576-993b-f7145c9d6e54	a0f08f0c-9d75-4923-a6e1-c92dfc079af6	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
2e5d0ad4-b919-4546-a367-afc0aa8115a1	596b2f24-28e0-48c8-a12d-4ad883b3d898	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
01283c66-cdcd-449c-ba74-569e5ebeecbe	9bc5192b-899c-410a-b658-9fd383375382	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
eb09c638-a826-435a-92f6-d102b6c18824	93440a7a-b7b0-4d6a-80a2-470e9c4b1629	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
4d60b192-762b-43bd-94fc-4810efd95491	3aec1e48-ab52-4482-9d44-18d605c90aeb	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
a9b4838f-2048-474b-8e72-6d7fb6bc75d2	365c7efd-a57a-479e-a5ed-a321c164eee7	147daaf1-9a9d-46a0-bca4-8b84076ee149	\N	Iphone 17 Pro	1	1230.00	{}
\.


--
-- Data for Name: order_status_audit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_status_audit (id, order_id, old_status, new_status, changed_at, changed_by, reason, source) FROM stdin;
1	8593f09b-b0d7-4d6f-9285-02928b9c7d98	pending	cancelled	2025-11-01 17:32:37.634674+00	\N	\N	orders.update
2	af21e154-c0ab-497a-8297-e7ea44743a1d	pending	cancelled	2025-11-01 19:14:07.311183+00	\N	\N	orders.update
3	79b412de-67f6-4740-9d97-c3fecb4b553f	pending	cancelled	2025-11-01 19:16:30.557022+00	\N	\N	orders.update
4	de90158d-b70b-4ffa-a5a7-3c3a7232279e	pending	cancelled	2025-11-01 19:26:20.1298+00	\N	\N	orders.update
5	e60fd539-3137-43f6-8698-4835528ae322	pending	cancelled	2025-11-01 19:35:08.115103+00	\N	\N	orders.update
6	755df648-772f-4fd1-8a91-a082f123b62c	pending	cancelled	2025-11-01 19:44:25.738855+00	\N	\N	orders.update
7	a0f08f0c-9d75-4923-a6e1-c92dfc079af6	pending	cancelled	2025-11-01 20:01:42.17095+00	\N	\N	orders.update
8	755df648-772f-4fd1-8a91-a082f123b62c	cancelled	paid	2025-11-01 20:03:58.198815+00	\N	\N	orders.update
9	596b2f24-28e0-48c8-a12d-4ad883b3d898	pending	cancelled	2025-11-01 20:04:17.855006+00	\N	\N	orders.update
10	e60fd539-3137-43f6-8698-4835528ae322	cancelled	paid	2025-11-01 20:12:05.868695+00	\N	\N	orders.update
11	596b2f24-28e0-48c8-a12d-4ad883b3d898	cancelled	paid	2025-11-01 20:12:05.868695+00	\N	\N	orders.update
17	9bc5192b-899c-410a-b658-9fd383375382	pending	paid	2025-11-01 20:21:24.036377+00	\N	\N	orders.update
18	93440a7a-b7b0-4d6a-80a2-470e9c4b1629	pending	cancelled	2025-11-01 21:33:33.97832+00	\N	\N	orders.update
19	3aec1e48-ab52-4482-9d44-18d605c90aeb	pending	cancelled	2025-11-01 21:36:02.84513+00	\N	\N	orders.update
20	365c7efd-a57a-479e-a5ed-a321c164eee7	pending	cancelled	2025-11-01 22:09:04.193591+00	\N	\N	orders.update
21	365c7efd-a57a-479e-a5ed-a321c164eee7	cancelled	paid	2025-11-01 22:09:22.770262+00	\N	\N	orders.update
\.


--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_status_history (id, order_id, from_status, to_status, changed_by, reason, created_at) FROM stdin;
3dc916ad-8d67-40c9-8490-a5d2146b6d42	8593f09b-b0d7-4d6f-9285-02928b9c7d98	\N	pending	\N	create	2025-11-01 17:32:29.400545+00
266e83f6-47e2-4dbc-9d02-19a5c99d3865	8593f09b-b0d7-4d6f-9285-02928b9c7d98	pending	cancelled	\N	\N	2025-11-01 17:32:37.634674+00
cbbc2482-7fd5-48f7-b0ed-37e3b3129e43	af21e154-c0ab-497a-8297-e7ea44743a1d	\N	pending	\N	create	2025-11-01 19:14:04.678607+00
025bb106-94af-4daa-8729-4b40fe3f87ed	af21e154-c0ab-497a-8297-e7ea44743a1d	pending	cancelled	\N	\N	2025-11-01 19:14:07.311183+00
42f990af-f673-4b6d-ac70-61c1f2cbce65	79b412de-67f6-4740-9d97-c3fecb4b553f	\N	pending	\N	create	2025-11-01 19:16:28.488856+00
add6f6d2-9152-4b48-a04b-ea8bf74b27cc	79b412de-67f6-4740-9d97-c3fecb4b553f	pending	cancelled	\N	\N	2025-11-01 19:16:30.557022+00
975d8a0b-3ef7-486d-bb26-cec9b15b7811	de90158d-b70b-4ffa-a5a7-3c3a7232279e	\N	pending	\N	create	2025-11-01 19:26:17.392659+00
7353b9c0-2dc0-4a70-9327-6b2c1f8bbbb9	de90158d-b70b-4ffa-a5a7-3c3a7232279e	pending	cancelled	\N	\N	2025-11-01 19:26:20.1298+00
b26e2cc8-bc84-4157-80f2-80d95114ba19	e60fd539-3137-43f6-8698-4835528ae322	\N	pending	\N	create	2025-11-01 19:35:04.497061+00
2280aa7e-f183-40ba-ab49-d3bfaf64bd66	e60fd539-3137-43f6-8698-4835528ae322	pending	cancelled	\N	\N	2025-11-01 19:35:08.115103+00
6af0fd46-213e-4057-9882-cfe0beede09f	755df648-772f-4fd1-8a91-a082f123b62c	\N	pending	\N	create	2025-11-01 19:44:23.153786+00
f0ebc352-d4b1-4f67-ac22-7d74d7175883	755df648-772f-4fd1-8a91-a082f123b62c	pending	cancelled	\N	\N	2025-11-01 19:44:25.738855+00
0c3dc4dc-b954-462e-b8b4-e8d8f6ac5a13	a0f08f0c-9d75-4923-a6e1-c92dfc079af6	\N	pending	\N	create	2025-11-01 20:01:39.802262+00
d860584a-cff7-42b2-9b74-2f481462d03a	a0f08f0c-9d75-4923-a6e1-c92dfc079af6	pending	cancelled	\N	\N	2025-11-01 20:01:42.17095+00
816af5fe-8478-4e94-a395-1d3f5604c3c1	755df648-772f-4fd1-8a91-a082f123b62c	cancelled	paid	\N	\N	2025-11-01 20:03:58.198815+00
13d2eee0-552e-4159-aa91-faf5bdb5550c	596b2f24-28e0-48c8-a12d-4ad883b3d898	\N	pending	\N	create	2025-11-01 20:04:15.488672+00
3e644e4d-5fca-4a14-9b32-48c111aaac9a	596b2f24-28e0-48c8-a12d-4ad883b3d898	pending	cancelled	\N	\N	2025-11-01 20:04:17.855006+00
0d4115b1-1d26-48e8-90af-be5dca218b85	e60fd539-3137-43f6-8698-4835528ae322	cancelled	paid	\N	\N	2025-11-01 20:12:05.868695+00
4ee5097d-a49e-410f-8e53-3499a34e799c	596b2f24-28e0-48c8-a12d-4ad883b3d898	cancelled	paid	\N	\N	2025-11-01 20:12:05.868695+00
bd289507-cd53-4778-8ed5-0aa6f0c919ea	9bc5192b-899c-410a-b658-9fd383375382	\N	pending	\N	create	2025-11-01 20:17:00.099051+00
823779ba-c051-4133-8ce0-ee7d54dd75c8	9bc5192b-899c-410a-b658-9fd383375382	pending	paid	\N	\N	2025-11-01 20:21:24.036377+00
b6b079c6-663d-47fd-a2bc-6e70347196b7	93440a7a-b7b0-4d6a-80a2-470e9c4b1629	\N	pending	\N	create	2025-11-01 21:33:31.978064+00
0bc5d225-0aeb-43d2-b46c-56df64a7a7c8	93440a7a-b7b0-4d6a-80a2-470e9c4b1629	pending	cancelled	\N	\N	2025-11-01 21:33:33.97832+00
1636b4c3-aeaf-4b2d-a0d5-a899eb72476b	3aec1e48-ab52-4482-9d44-18d605c90aeb	\N	pending	\N	create	2025-11-01 21:36:01.245457+00
da85215a-5139-449d-ac8f-936f644f7121	3aec1e48-ab52-4482-9d44-18d605c90aeb	pending	cancelled	\N	\N	2025-11-01 21:36:02.84513+00
6e7d6bde-f453-46b6-8d54-9466d0ad411c	365c7efd-a57a-479e-a5ed-a321c164eee7	\N	pending	\N	create	2025-11-01 22:09:02.18534+00
0cbd2e06-4783-4a55-96f6-b45157ea2dab	365c7efd-a57a-479e-a5ed-a321c164eee7	pending	cancelled	\N	\N	2025-11-01 22:09:04.193591+00
503bfdf7-b386-4b7f-87c5-d2bbe4c3648e	365c7efd-a57a-479e-a5ed-a321c164eee7	cancelled	paid	\N	\N	2025-11-01 22:09:22.770262+00
\.


--
-- Data for Name: orders_archive; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders_archive (id, user_id, status, payment_status, subtotal, discount_total, shipping_total, grand_total, currency, created_at, paid_at, cancelled_at, checkout_metadata, contact_email, metadata_b, amount_cents, payment_intent_id, archived_at, archive_run_id, archived_payload) FROM stdin;
bec40d61-b213-42ea-8ad3-d4f5a2f94523	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	5999.94	0	0	5999.94	USD	2025-09-14 13:29:46.648063+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [{"id": "a73816a4-45df-4938-981f-9b7e860e72f8", "qty": 6, "meta": {}, "title": "Beta Mechanical Keyboard", "total": 5999.94, "order_id": "bec40d61-b213-42ea-8ad3-d4f5a2f94523", "product_id": "ec2db82a-5df4-40f9-ae91-4643a88d6363", "unit_price": 999.99, "variant_id": null}], "history": [{"amount": 5999.94, "status": "succeeded", "currency": "USD", "order_id": "bec40d61-b213-42ea-8ad3-d4f5a2f94523", "created_at": "2025-09-14T13:29:46.648063+00:00"}], "refunds": [], "payments": [{"id": "dcbef4a5-2398-4a44-806f-ba943fb45192", "amount": 999.99, "status": "succeeded", "currency": "EUR", "order_id": "bec40d61-b213-42ea-8ad3-d4f5a2f94523", "provider": "testpay", "created_at": "2025-09-14T13:32:08.928683+00:00", "provider_ref": "simulated-123"}]}
f08c5f7d-6e70-4137-b072-9da60039929d	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-14 14:28:34.994943+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "f08c5f7d-6e70-4137-b072-9da60039929d", "created_at": "2025-09-14T14:28:34.994943+00:00"}], "refunds": [], "payments": []}
6eb2d400-6509-427d-941e-8ef0d9cea063	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-14 14:30:01.080827+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "6eb2d400-6509-427d-941e-8ef0d9cea063", "created_at": "2025-09-14T14:30:01.080827+00:00"}], "refunds": [], "payments": []}
1fc9494d-cc20-4e5f-83a5-38525e096169	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	246.9	0	0	246.9	EUR	2025-09-14 14:20:34.402571+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [{"id": "a61cac76-fa26-4435-9845-10468f37559f", "qty": 2, "meta": {}, "title": "хуй резиновый", "total": 246.9, "order_id": "1fc9494d-cc20-4e5f-83a5-38525e096169", "product_id": "0860cae1-9903-47b4-a072-06a6ffd84922", "unit_price": 123.45, "variant_id": null}], "history": [{"amount": 246.9, "status": "pending", "currency": "EUR", "order_id": "1fc9494d-cc20-4e5f-83a5-38525e096169", "created_at": "2025-09-14T14:20:34.402571+00:00"}], "refunds": [], "payments": [{"id": "f4665b20-f081-4209-b3f7-a27acca8b567", "amount": 246.9, "status": "pending", "currency": "EUR", "order_id": "1fc9494d-cc20-4e5f-83a5-38525e096169", "provider": "mockpay", "created_at": "2025-09-15T17:16:10.551996+00:00", "provider_ref": "authorized"}, {"id": "72395aef-4165-43ef-90c1-d798bbadc715", "amount": 246.9, "status": "pending", "currency": "EUR", "order_id": "1fc9494d-cc20-4e5f-83a5-38525e096169", "provider": "mockpay", "created_at": "2025-09-15T17:16:10.845224+00:00", "provider_ref": "requires_action"}]}
07ef0878-481e-48b1-ac99-276029a02970	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-14 14:30:14.645991+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "07ef0878-481e-48b1-ac99-276029a02970", "created_at": "2025-09-14T14:30:14.645991+00:00"}], "refunds": [], "payments": []}
a00da6ef-4fb1-4001-9a59-734b379c17f5	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	60000	0	0	60000	USD	2025-09-14 14:35:21.225015+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [{"id": "08f1eead-4458-4ee7-99a9-10186b7dc00a", "qty": 6, "meta": {"reason": "profanity", "moderated": true}, "title": "[redacted]", "total": 60000, "order_id": "a00da6ef-4fb1-4001-9a59-734b379c17f5", "product_id": "0860cae1-9903-47b4-a072-06a6ffd84922", "unit_price": 10000, "variant_id": null}], "history": [{"amount": 60000, "status": "succeeded", "currency": "USD", "order_id": "a00da6ef-4fb1-4001-9a59-734b379c17f5", "created_at": "2025-09-14T14:35:21.225015+00:00"}], "refunds": [], "payments": [{"id": "55bc625e-9131-41be-975b-7109f17c052c", "amount": 10000, "status": "succeeded", "currency": "EUR", "order_id": "a00da6ef-4fb1-4001-9a59-734b379c17f5", "provider": "test", "created_at": "2025-09-14T14:38:36.717712+00:00", "provider_ref": "manual-ok"}]}
c841319a-dfd0-42e1-bb4c-173fca418423	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-14 17:26:24.603622+00	\N	2025-09-15 17:15:59.234+00	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "c841319a-dfd0-42e1-bb4c-173fca418423", "created_at": "2025-09-14T17:26:24.603622+00:00"}], "refunds": [], "payments": []}
fd974aa4-4620-48fe-a8c3-ade56508d7cd	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-14 17:41:58.396724+00	\N	2025-09-15 17:15:59.851+00	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "fd974aa4-4620-48fe-a8c3-ade56508d7cd", "created_at": "2025-09-14T17:41:58.396724+00:00"}], "refunds": [], "payments": []}
fe75673f-3eb3-49d1-82bf-9f2866fd232a	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-14 17:42:09.423909+00	\N	2025-09-15 17:16:00.939+00	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "fe75673f-3eb3-49d1-82bf-9f2866fd232a", "created_at": "2025-09-14T17:42:09.423909+00:00"}], "refunds": [], "payments": []}
f6ae1513-2c68-4e58-8ac1-08b4ace3d95a	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-14 17:42:30.377072+00	\N	2025-09-15 17:16:01.377+00	{}	\N	{}	\N	\N	2025-10-21 22:09:50.634+00	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "f6ae1513-2c68-4e58-8ac1-08b4ace3d95a", "created_at": "2025-09-14T17:42:30.377072+00:00"}], "refunds": [], "payments": []}
37781838-9399-459b-b8b0-2f08c94c4f2a	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	50000	0	0	50000	EUR	2025-09-14 18:19:59.615565+00	\N	2025-09-15 17:16:01.973+00	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [{"id": "b15364f2-cc01-4a48-a735-d1857be14584", "qty": 5, "meta": {}, "title": "хуй резиновый", "total": 50000, "order_id": "37781838-9399-459b-b8b0-2f08c94c4f2a", "product_id": "0860cae1-9903-47b4-a072-06a6ffd84922", "unit_price": 10000, "variant_id": null}], "history": [{"amount": 50000, "status": "cancelled", "currency": "EUR", "order_id": "37781838-9399-459b-b8b0-2f08c94c4f2a", "created_at": "2025-09-14T18:19:59.615565+00:00"}], "refunds": [], "payments": []}
2ba1607c-d94e-413f-bfe7-06e19b6db43c	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	paid	99.99	0	0	99.99	EUR	2025-09-14 18:20:21.54663+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [{"id": "cae4d201-73a6-4134-8e36-e90867eed0f3", "qty": 1, "meta": {}, "title": "хуй резиновый", "total": 99.99, "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "product_id": "e9d235b6-85d8-4832-aa10-8b5a20297868", "unit_price": 99.99, "variant_id": null}], "history": [{"amount": 99.99, "status": "pending", "currency": "EUR", "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "created_at": "2025-09-14T18:20:21.54663+00:00"}], "refunds": [], "payments": [{"id": "99c419bd-acf2-4bb6-a8c3-9128c6b9a0e0", "amount": 99.99, "status": "pending", "currency": "EUR", "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "provider": "mockpay", "created_at": "2025-09-15T17:15:45.63919+00:00", "provider_ref": "authorized"}, {"id": "07c2da23-49f5-4989-9867-c318b6916757", "amount": 99.99, "status": "pending", "currency": "EUR", "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "provider": "mockpay", "created_at": "2025-09-15T17:15:45.913041+00:00", "provider_ref": "requires_action"}, {"id": "92dba82d-0bf5-49fe-9976-a27cd4fe5f2c", "amount": 99.99, "status": "pending", "currency": "EUR", "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "provider": "mockpay", "created_at": "2025-09-15T17:16:22.871901+00:00", "provider_ref": "authorized"}, {"id": "b0b4f0be-9868-464b-b24f-7347735b9745", "amount": 99.99, "status": "pending", "currency": "EUR", "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "provider": "mockpay", "created_at": "2025-09-15T17:16:23.140946+00:00", "provider_ref": "authorized"}, {"id": "64ab0b97-6c5c-4b3b-a63e-509c461ab570", "amount": 99.99, "status": "pending", "currency": "EUR", "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "provider": "mockpay", "created_at": "2025-09-15T17:16:28.322567+00:00", "provider_ref": "authorized"}, {"id": "dfce232c-23a7-4d76-baa3-1cf59a14f42d", "amount": 99.99, "status": "paid", "currency": "EUR", "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "provider": "mockpay", "created_at": "2025-09-15T17:16:28.626044+00:00", "provider_ref": "succeeded"}, {"id": "c548b336-6b04-4055-b722-f95c7e35bb7d", "amount": 99.99, "status": "pending", "currency": "EUR", "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "provider": "mockpay", "created_at": "2025-09-15T17:17:08.628525+00:00", "provider_ref": "authorized"}, {"id": "682db813-9155-427f-98b3-68e3e3634b78", "amount": 99.99, "status": "pending", "currency": "EUR", "order_id": "2ba1607c-d94e-413f-bfe7-06e19b6db43c", "provider": "mockpay", "created_at": "2025-09-15T17:17:08.880506+00:00", "provider_ref": "authorized"}]}
92742fbb-0c55-40cb-88eb-333076957928	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	100000	0	0	100000	EUR	2025-09-14 20:21:03.821234+00	\N	2025-09-15 17:16:04.81+00	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [{"id": "59533f9d-89e6-4fc2-8d2c-39dab7f0c0b4", "qty": 10, "meta": {}, "title": "хуй резиновый", "total": 100000, "order_id": "92742fbb-0c55-40cb-88eb-333076957928", "product_id": "0860cae1-9903-47b4-a072-06a6ffd84922", "unit_price": 10000, "variant_id": null}], "history": [{"amount": 100000, "status": "cancelled", "currency": "EUR", "order_id": "92742fbb-0c55-40cb-88eb-333076957928", "created_at": "2025-09-14T20:21:03.821234+00:00"}], "refunds": [], "payments": []}
737ed2fe-1ca9-4e37-92b3-c30df3ffb896	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	30000	0	0	30000	EUR	2025-09-15 13:02:06.306274+00	\N	2025-09-15 17:16:04.285+00	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [{"id": "27701266-9a71-4f40-8d35-f687bc876815", "qty": 3, "meta": {}, "title": "хуй резиновый", "total": 30000, "order_id": "737ed2fe-1ca9-4e37-92b3-c30df3ffb896", "product_id": "0860cae1-9903-47b4-a072-06a6ffd84922", "unit_price": 10000, "variant_id": null}], "history": [{"amount": 30000, "status": "cancelled", "currency": "EUR", "order_id": "737ed2fe-1ca9-4e37-92b3-c30df3ffb896", "created_at": "2025-09-15T13:02:06.306274+00:00"}], "refunds": [], "payments": []}
892028d1-be71-43a5-adf4-e8d5aabfe799	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	paid	100	0	0	100	EUR	2025-09-15 14:35:56.238841+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [{"id": "0b865312-69a7-479d-ac6c-ce25d659c2a9", "qty": 1, "meta": {}, "title": "хуй резиновый", "total": 100, "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "product_id": "80445305-ae28-4966-a4dd-1869cfcc5fd6", "unit_price": 100, "variant_id": null}], "history": [{"amount": 100, "status": "pending", "currency": "EUR", "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "created_at": "2025-09-15T14:35:56.238841+00:00"}], "refunds": [], "payments": [{"id": "594b9f5f-f4c8-49c6-b231-a7c47375699d", "amount": 100, "status": "pending", "currency": "EUR", "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "provider": "mockpay", "created_at": "2025-09-15T17:15:42.767065+00:00", "provider_ref": "authorized"}, {"id": "b92dd654-3682-442b-b1d5-4099ee765005", "amount": 100, "status": "paid", "currency": "EUR", "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "provider": "mockpay", "created_at": "2025-09-15T17:15:43.019873+00:00", "provider_ref": "succeeded"}, {"id": "e2c32d05-1bbd-4531-8933-b74af64cc59c", "amount": 100, "status": "pending", "currency": "EUR", "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "provider": "mockpay", "created_at": "2025-09-15T17:16:21.524685+00:00", "provider_ref": "authorized"}, {"id": "cec321ea-6588-4b0b-a889-57b0f513df26", "amount": 100, "status": "paid", "currency": "EUR", "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "provider": "mockpay", "created_at": "2025-09-15T17:16:21.814348+00:00", "provider_ref": "succeeded"}, {"id": "e0abb601-ecbf-4001-a8db-8679989f9058", "amount": 100, "status": "pending", "currency": "EUR", "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "provider": "mockpay", "created_at": "2025-09-15T17:16:27.430994+00:00", "provider_ref": "authorized"}, {"id": "ddf35195-2c61-4ee1-a345-4130aced923d", "amount": 100, "status": "pending", "currency": "EUR", "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "provider": "mockpay", "created_at": "2025-09-15T17:16:27.72806+00:00", "provider_ref": "authorized"}, {"id": "99860df6-6d1c-4617-9abf-d82603cdf589", "amount": 100, "status": "pending", "currency": "EUR", "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "provider": "mockpay", "created_at": "2025-09-15T17:17:07.347391+00:00", "provider_ref": "authorized"}, {"id": "285214d6-1e2c-4e09-adcc-67121bf51ef4", "amount": 100, "status": "paid", "currency": "EUR", "order_id": "892028d1-be71-43a5-adf4-e8d5aabfe799", "provider": "mockpay", "created_at": "2025-09-15T17:17:07.597573+00:00", "provider_ref": "succeeded"}]}
65f1d64c-07e9-47b5-8162-355789050522	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-15 15:18:34.927533+00	\N	2025-09-15 17:15:36.294+00	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "65f1d64c-07e9-47b5-8162-355789050522", "created_at": "2025-09-15T15:18:34.927533+00:00"}], "refunds": [], "payments": []}
ab804bc0-8162-43ba-ae69-a1e07bce7a8f	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	80	0	0	80	EUR	2025-09-15 15:22:56.375381+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [{"id": "67f0b2f5-7dd1-4457-94cf-6bf91b831e68", "qty": 1, "meta": {}, "title": "Alpha Headphones", "total": 80, "order_id": "ab804bc0-8162-43ba-ae69-a1e07bce7a8f", "product_id": "b370b425-3732-4311-b65d-044adf205e31", "unit_price": 80, "variant_id": null}], "history": [{"amount": 80, "status": "pending", "currency": "EUR", "order_id": "ab804bc0-8162-43ba-ae69-a1e07bce7a8f", "created_at": "2025-09-15T15:22:56.375381+00:00"}], "refunds": [], "payments": [{"id": "eea81fc4-c8eb-4813-a3a4-0fb8e3971478", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "ab804bc0-8162-43ba-ae69-a1e07bce7a8f", "provider": "mockpay", "created_at": "2025-09-15T17:15:30.035383+00:00", "provider_ref": "authorized"}, {"id": "99d8a9cb-3a2f-4fb1-9b3e-5d7b2b7ede4f", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "ab804bc0-8162-43ba-ae69-a1e07bce7a8f", "provider": "mockpay", "created_at": "2025-09-15T17:15:30.289522+00:00", "provider_ref": "authorized"}, {"id": "2f9e8e84-79b3-4c72-9233-c56653357ba5", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "ab804bc0-8162-43ba-ae69-a1e07bce7a8f", "provider": "mockpay", "created_at": "2025-09-15T17:16:16.133493+00:00", "provider_ref": "authorized"}, {"id": "0052fec8-312a-4b4b-b665-5b6ce34d2ad8", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "ab804bc0-8162-43ba-ae69-a1e07bce7a8f", "provider": "mockpay", "created_at": "2025-09-15T17:16:17.156151+00:00", "provider_ref": "authorized"}, {"id": "7b55b8ec-4b2a-4100-bde5-3244f084d4ed", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "ab804bc0-8162-43ba-ae69-a1e07bce7a8f", "provider": "mockpay", "created_at": "2025-09-15T17:16:17.427906+00:00", "provider_ref": "requires_action"}, {"id": "e0c4c739-1943-41b4-8c4c-8695d0565de9", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "ab804bc0-8162-43ba-ae69-a1e07bce7a8f", "provider": "mockpay", "created_at": "2025-09-15T17:16:33.980152+00:00", "provider_ref": "authorized"}, {"id": "4eb30ede-a949-4273-a820-5c5a252fd41f", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "ab804bc0-8162-43ba-ae69-a1e07bce7a8f", "provider": "mockpay", "created_at": "2025-09-15T17:16:34.252831+00:00", "provider_ref": "requires_action"}]}
f25a1418-2f00-40b6-bd57-61c8e2b87acf	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	80	0	0	80	EUR	2025-09-15 15:26:49.176408+00	\N	2025-09-15 17:15:30.341+00	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [{"id": "652c12c7-55f9-499a-9bec-585214b047aa", "qty": 1, "meta": {}, "title": "Alpha Headphones", "total": 80, "order_id": "f25a1418-2f00-40b6-bd57-61c8e2b87acf", "product_id": "b370b425-3732-4311-b65d-044adf205e31", "unit_price": 80, "variant_id": null}], "history": [{"amount": 80, "status": "cancelled", "currency": "EUR", "order_id": "f25a1418-2f00-40b6-bd57-61c8e2b87acf", "created_at": "2025-09-15T15:26:49.176408+00:00"}], "refunds": [], "payments": []}
07116bf7-e925-4c34-ba74-543953a75cd5	db93c961-5f77-41d3-96d2-9b50eaabb3ab	refunded	paid	80	0	0	80	EUR	2025-09-15 15:33:21.441668+00	\N	2025-09-15 17:15:29.19+00	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [{"id": "f53cf561-e000-4bf7-8ab7-2ed72369ea39", "qty": 1, "meta": {}, "title": "Alpha Headphones", "total": 80, "order_id": "07116bf7-e925-4c34-ba74-543953a75cd5", "product_id": "b370b425-3732-4311-b65d-044adf205e31", "unit_price": 80, "variant_id": null}], "history": [{"amount": 80, "status": "pending", "currency": "EUR", "order_id": "07116bf7-e925-4c34-ba74-543953a75cd5", "created_at": "2025-09-15T15:33:21.441668+00:00"}], "refunds": [], "payments": [{"id": "ed87ce89-c062-4137-8aee-fec52abd8e8f", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "07116bf7-e925-4c34-ba74-543953a75cd5", "provider": "mockpay", "created_at": "2025-09-15T15:51:33.392947+00:00", "provider_ref": "authorized"}, {"id": "303dae54-7646-4b3a-bb1a-9f317d70b55e", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "07116bf7-e925-4c34-ba74-543953a75cd5", "provider": "mockpay", "created_at": "2025-09-15T15:52:10.326362+00:00", "provider_ref": "authorized"}, {"id": "90ba413f-14d8-46eb-b9f5-7a93a1e34624", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "07116bf7-e925-4c34-ba74-543953a75cd5", "provider": "mockpay", "created_at": "2025-09-15T15:52:27.066141+00:00", "provider_ref": "authorized"}, {"id": "66edfea5-8e55-4d25-a717-dec7fee6be3c", "amount": 80, "status": "paid", "currency": "EUR", "order_id": "07116bf7-e925-4c34-ba74-543953a75cd5", "provider": "mockpay", "created_at": "2025-09-15T15:52:32.647374+00:00", "provider_ref": "succeeded"}]}
5de8d73d-8f5a-4a56-a848-581ed544ee23	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-15 15:46:19.195797+00	\N	2025-09-15 17:15:27.894+00	{}	\N	{}	\N	\N	2025-10-21 22:10:51.659+00	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "5de8d73d-8f5a-4a56-a848-581ed544ee23", "created_at": "2025-09-15T15:46:19.195797+00:00"}], "refunds": [], "payments": []}
3b4932c8-6ebd-46ae-af1d-6d842cd01898	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	0	0	0	0	EUR	2025-09-15 15:46:50.913662+00	\N	2025-09-15 17:15:26.536+00	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [], "history": [{"amount": 0, "status": "cancelled", "currency": "EUR", "order_id": "3b4932c8-6ebd-46ae-af1d-6d842cd01898", "created_at": "2025-09-15T15:46:50.913662+00:00"}], "refunds": [], "payments": []}
a7d727f1-7174-409a-926d-c6c1797b1c34	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	80	0	0	80	EUR	2025-09-15 15:49:20.490483+00	\N	2025-09-15 17:15:25.25+00	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [{"id": "7f2dc592-dd93-4dd6-a5ad-f01ad5794656", "qty": 1, "meta": {}, "title": "Alpha Headphones", "total": 80, "order_id": "a7d727f1-7174-409a-926d-c6c1797b1c34", "product_id": "b370b425-3732-4311-b65d-044adf205e31", "unit_price": 80, "variant_id": null}], "history": [{"amount": 80, "status": "pending", "currency": "EUR", "order_id": "a7d727f1-7174-409a-926d-c6c1797b1c34", "created_at": "2025-09-15T15:49:20.490483+00:00"}], "refunds": [], "payments": [{"id": "09dc0760-4939-4ad9-b2a6-fb48d7c79201", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "a7d727f1-7174-409a-926d-c6c1797b1c34", "provider": "mockpay", "created_at": "2025-09-15T15:51:12.369496+00:00", "provider_ref": "authorized"}, {"id": "06a0323a-d8ed-46f3-b0b5-1ce212bc49eb", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "a7d727f1-7174-409a-926d-c6c1797b1c34", "provider": "mockpay", "created_at": "2025-09-15T16:18:38.998114+00:00", "provider_ref": "authorized"}, {"id": "f02c6662-a84b-4e3d-8228-dbb4dfd24120", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "a7d727f1-7174-409a-926d-c6c1797b1c34", "provider": "mockpay", "created_at": "2025-09-15T16:18:39.416061+00:00", "provider_ref": "requires_action"}]}
fb0a1445-4abb-43b2-8fe7-0c9cfe6da3b8	db93c961-5f77-41d3-96d2-9b50eaabb3ab	refunded	paid	80	0	0	80	EUR	2025-09-15 16:37:11.915546+00	\N	2025-09-15 17:15:24.148+00	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [{"id": "0c08b5ca-f7c7-4883-b23c-e47cb76915bc", "qty": 1, "meta": {}, "title": "Alpha Headphones", "total": 80, "order_id": "fb0a1445-4abb-43b2-8fe7-0c9cfe6da3b8", "product_id": "b370b425-3732-4311-b65d-044adf205e31", "unit_price": 80, "variant_id": null}], "history": [{"amount": 80, "status": "pending", "currency": "EUR", "order_id": "fb0a1445-4abb-43b2-8fe7-0c9cfe6da3b8", "created_at": "2025-09-15T16:37:11.915546+00:00"}], "refunds": [], "payments": [{"id": "d50aec3e-6696-479e-bfe5-3559498bd178", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "fb0a1445-4abb-43b2-8fe7-0c9cfe6da3b8", "provider": "mockpay", "created_at": "2025-09-15T16:37:40.065701+00:00", "provider_ref": "authorized"}, {"id": "f409f655-0a72-4d35-8386-d3e72fb5ba93", "amount": 80, "status": "paid", "currency": "EUR", "order_id": "fb0a1445-4abb-43b2-8fe7-0c9cfe6da3b8", "provider": "mockpay", "created_at": "2025-09-15T16:37:48.832948+00:00", "provider_ref": "succeeded"}]}
4b26daf3-d91f-4456-9ffa-322ce27dbbe8	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	authorized	80	0	0	80	EUR	2025-09-15 16:39:10.145565+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [{"id": "eb13d59a-4940-4e65-8ec4-5213de2bc877", "qty": 1, "meta": {}, "title": "Alpha Headphones", "total": 80, "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "product_id": "b370b425-3732-4311-b65d-044adf205e31", "unit_price": 80, "variant_id": null}], "history": [{"amount": 80, "status": "pending", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "created_at": "2025-09-15T16:39:10.145565+00:00"}], "refunds": [], "payments": [{"id": "8b284200-ef49-49f0-9c60-cbf0ab08d484", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T16:39:55.536158+00:00", "provider_ref": "authorized"}, {"id": "637fa5e8-ab89-4170-8b2e-d44b1633069f", "amount": 80, "status": "paid", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T16:39:59.245556+00:00", "provider_ref": "succeeded"}, {"id": "d5addc78-e791-4501-9e5c-a76286cb46c6", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T17:15:22.08804+00:00", "provider_ref": "authorized"}, {"id": "231b5d0b-46e7-4ae1-93f2-2f17c5ceb626", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T17:15:22.479073+00:00", "provider_ref": "authorized"}, {"id": "92e60139-9b0e-44d0-9bed-6777278dfffb", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T17:16:18.739493+00:00", "provider_ref": "authorized"}, {"id": "32ef4620-2dee-41d0-8136-0f00a1020af1", "amount": 80, "status": "paid", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T17:16:19.010708+00:00", "provider_ref": "succeeded"}, {"id": "9e32d6e3-89fc-4588-a6f1-afab45252174", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T17:16:31.424442+00:00", "provider_ref": "authorized"}, {"id": "1a4b9ad1-44f4-4163-983b-bbd8593726d6", "amount": 80, "status": "paid", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T17:16:31.70273+00:00", "provider_ref": "succeeded"}, {"id": "4bd8e116-1c5a-4cfe-9713-141865f0efcd", "amount": 80, "status": "authorized", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T18:11:35.301223+00:00", "provider_ref": "authorized"}, {"id": "f9e3b382-be2c-4e3e-9172-78f7f9aae115", "amount": 80, "status": "authorized", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T18:11:40.300484+00:00", "provider_ref": "authorized"}, {"id": "6ebb84c6-843c-48ed-9581-1d920181edc0", "amount": 80, "status": "authorized", "currency": "EUR", "order_id": "4b26daf3-d91f-4456-9ffa-322ce27dbbe8", "provider": "mockpay", "created_at": "2025-09-15T18:11:40.544184+00:00", "provider_ref": "authorized"}]}
0f038fef-a1de-4a83-9fe2-06c81fda808f	db93c961-5f77-41d3-96d2-9b50eaabb3ab	refunded	paid	80	0	0	80	EUR	2025-09-15 16:42:05.914741+00	\N	2025-09-15 16:42:57.387+00	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [{"id": "29b263c6-098b-4a4c-83c0-9474d478f033", "qty": 1, "meta": {}, "title": "Alpha Headphones", "total": 80, "order_id": "0f038fef-a1de-4a83-9fe2-06c81fda808f", "product_id": "b370b425-3732-4311-b65d-044adf205e31", "unit_price": 80, "variant_id": null}], "history": [{"amount": 80, "status": "pending", "currency": "EUR", "order_id": "0f038fef-a1de-4a83-9fe2-06c81fda808f", "created_at": "2025-09-15T16:42:05.914741+00:00"}], "refunds": [], "payments": [{"id": "288f996c-4a4d-495d-83cd-b95a2c6ed506", "amount": 80, "status": "pending", "currency": "EUR", "order_id": "0f038fef-a1de-4a83-9fe2-06c81fda808f", "provider": "mockpay", "created_at": "2025-09-15T16:42:16.647374+00:00", "provider_ref": "authorized"}, {"id": "8d7cee50-b78d-43e7-ab0f-10e8cf382604", "amount": 80, "status": "paid", "currency": "EUR", "order_id": "0f038fef-a1de-4a83-9fe2-06c81fda808f", "provider": "mockpay", "created_at": "2025-09-15T16:42:20.700369+00:00", "provider_ref": "succeeded"}]}
a894cc3b-e0ce-41e0-9e1d-36f8f5d93bde	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	authorized	80	0	0	80	EUR	2025-09-15 17:38:23.326509+00	\N	2025-09-15 19:18:05.712+00	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [{"id": "5ed8f5ff-a344-4a99-bc62-99ff64e65276", "qty": 1, "meta": {}, "title": "Alpha Headphones", "total": 80, "order_id": "a894cc3b-e0ce-41e0-9e1d-36f8f5d93bde", "product_id": "b370b425-3732-4311-b65d-044adf205e31", "unit_price": 80, "variant_id": null}], "history": [{"amount": 80, "status": "authorized", "currency": "EUR", "order_id": "a894cc3b-e0ce-41e0-9e1d-36f8f5d93bde", "created_at": "2025-09-15T17:38:23.326509+00:00"}], "refunds": [], "payments": [{"id": "ba51d983-dab6-4189-9a0a-67126b855685", "amount": 80, "status": "authorized", "currency": "EUR", "order_id": "a894cc3b-e0ce-41e0-9e1d-36f8f5d93bde", "provider": "mockpay", "created_at": "2025-09-15T18:11:31.670232+00:00", "provider_ref": "authorized"}, {"id": "0c719a63-367c-4cba-b93a-7825185d94e2", "amount": 80, "status": "authorized", "currency": "EUR", "order_id": "a894cc3b-e0ce-41e0-9e1d-36f8f5d93bde", "provider": "mockpay", "created_at": "2025-09-15T18:11:33.371785+00:00", "provider_ref": "authorized"}]}
3bb086e4-d452-4c0d-887c-1d75b35cc3dd	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	authorized	100	0	0	100	EUR	2025-09-15 17:43:10.144837+00	\N	2025-09-15 19:18:04.68+00	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [{"id": "a001195e-c07d-49b6-a386-dcfd0da2db9d", "qty": 1, "meta": {}, "title": "хуй резиновый", "total": 100, "order_id": "3bb086e4-d452-4c0d-887c-1d75b35cc3dd", "product_id": "80445305-ae28-4966-a4dd-1869cfcc5fd6", "unit_price": 100, "variant_id": null}], "history": [{"amount": 100, "status": "authorized", "currency": "EUR", "order_id": "3bb086e4-d452-4c0d-887c-1d75b35cc3dd", "created_at": "2025-09-15T17:43:10.144837+00:00"}], "refunds": [], "payments": [{"id": "b523122a-7dff-42d6-b687-98433e1bb080", "amount": 100, "status": "authorized", "currency": "EUR", "order_id": "3bb086e4-d452-4c0d-887c-1d75b35cc3dd", "provider": "mockpay", "created_at": "2025-09-15T18:11:29.863576+00:00", "provider_ref": "authorized"}, {"id": "b156becb-5634-4c26-9df2-e586d0aa54d6", "amount": 100, "status": "authorized", "currency": "EUR", "order_id": "3bb086e4-d452-4c0d-887c-1d75b35cc3dd", "provider": "mockpay", "created_at": "2025-09-15T18:11:36.99316+00:00", "provider_ref": "authorized"}, {"id": "26cb3119-bcfe-47b8-99c9-9a08bc9f742d", "amount": 100, "status": "authorized", "currency": "EUR", "order_id": "3bb086e4-d452-4c0d-887c-1d75b35cc3dd", "provider": "mockpay", "created_at": "2025-09-15T19:18:03.524378+00:00", "provider_ref": "authorized"}]}
b01916d0-0c07-4591-85ef-476931712215	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	99.99	0	0	99.99	EUR	2025-09-15 17:43:31.599278+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [{"id": "c2297059-9599-4039-97c7-70d6ed0ed430", "qty": 1, "meta": {}, "title": "хуй резиновый", "total": 99.99, "order_id": "b01916d0-0c07-4591-85ef-476931712215", "product_id": "e9d235b6-85d8-4832-aa10-8b5a20297868", "unit_price": 99.99, "variant_id": null}], "history": [{"amount": 99.99, "status": "failed", "currency": "EUR", "order_id": "b01916d0-0c07-4591-85ef-476931712215", "created_at": "2025-09-15T17:43:31.599278+00:00"}], "refunds": [], "payments": [{"id": "0badb33d-8559-4364-b194-615fcff48cd6", "amount": 99.99, "status": "authorized", "currency": "EUR", "order_id": "b01916d0-0c07-4591-85ef-476931712215", "provider": "mockpay", "created_at": "2025-09-15T18:11:28.399197+00:00", "provider_ref": "authorized"}, {"id": "2e4cad4d-1d37-4c3e-af35-15fdc951f0da", "amount": 99.99, "status": "authorized", "currency": "EUR", "order_id": "b01916d0-0c07-4591-85ef-476931712215", "provider": "mockpay", "created_at": "2025-09-15T18:11:28.676565+00:00", "provider_ref": "authorized"}, {"id": "c12bf798-9ad8-4a71-acb7-533d395b1a71", "amount": 99.99, "status": "authorized", "currency": "EUR", "order_id": "b01916d0-0c07-4591-85ef-476931712215", "provider": "mockpay", "created_at": "2025-09-15T19:18:03.534001+00:00", "provider_ref": "authorized"}, {"id": "0d27ad9a-2162-4601-a1ac-55ea27245242", "amount": 99.99, "status": "failed", "currency": "EUR", "order_id": "b01916d0-0c07-4591-85ef-476931712215", "provider": "mockpay", "created_at": "2025-09-15T19:18:03.809321+00:00", "provider_ref": "failed"}]}
4e6d240a-68c4-4260-abdf-e1ad7f0b7fac	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	229	0	0	229	EUR	2025-09-15 17:50:54.469129+00	\N	2025-09-15 17:55:51.333+00	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [{"id": "c875d19d-6e2a-4492-8aab-337c20b0e082", "qty": 1, "meta": {}, "title": "Omega 27\\\\' Monitor", "total": 229, "order_id": "4e6d240a-68c4-4260-abdf-e1ad7f0b7fac", "product_id": "03dbd39a-a6da-49a2-9047-820c4aeb9de9", "unit_price": 229, "variant_id": null}], "history": [{"amount": 229, "status": "cancelled", "currency": "EUR", "order_id": "4e6d240a-68c4-4260-abdf-e1ad7f0b7fac", "created_at": "2025-09-15T17:50:54.469129+00:00"}], "refunds": [], "payments": []}
d34a1431-fbc7-4be0-adcf-cc324a34254d	db93c961-5f77-41d3-96d2-9b50eaabb3ab	cancelled	failed	10000	0	0	10000	EUR	2025-09-15 17:51:16.440859+00	\N	2025-09-15 17:51:22.854+00	{}	\N	{}	\N	\N	2025-10-21 22:12:19.871+00	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	{"items": [{"id": "baa73820-a3ab-4610-9876-9a61a0fd9bbc", "qty": 1, "meta": {}, "title": "хуй резиновый", "total": 10000, "order_id": "d34a1431-fbc7-4be0-adcf-cc324a34254d", "product_id": "0860cae1-9903-47b4-a072-06a6ffd84922", "unit_price": 10000, "variant_id": null}], "history": [{"amount": 10000, "status": "cancelled", "currency": "EUR", "order_id": "d34a1431-fbc7-4be0-adcf-cc324a34254d", "created_at": "2025-09-15T17:51:16.440859+00:00"}], "refunds": [], "payments": []}
25ce67f4-e9fc-4442-b67e-96cb347ad8fc	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	59.99	0	0	59.99	EUR	2025-09-16 17:47:26.255527+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "53387ea5-13b5-4452-b795-5f71827ba305", "qty": 1, "meta": {}, "title": "Beta Mechanical Keyboard", "total": 59.99, "order_id": "25ce67f4-e9fc-4442-b67e-96cb347ad8fc", "product_id": "fa18729a-8aaa-4552-9f6c-bc9851102af3", "unit_price": 59.99, "variant_id": null}], "history": [{"amount": 59.99, "status": "succeeded", "currency": "EUR", "order_id": "25ce67f4-e9fc-4442-b67e-96cb347ad8fc", "created_at": "2025-09-16T17:47:26.255527+00:00"}], "refunds": [], "payments": [{"id": "681d95f0-f874-4e69-9f54-8be8e9870c98", "amount": 59.99, "status": "authorized", "currency": "EUR", "order_id": "25ce67f4-e9fc-4442-b67e-96cb347ad8fc", "provider": "mockpay", "created_at": "2025-09-16T17:47:31.363741+00:00", "provider_ref": "authorized"}, {"id": "18b0eb88-9a08-4265-b566-d4e26c1fa8ef", "amount": 59.99, "status": "succeeded", "currency": "EUR", "order_id": "25ce67f4-e9fc-4442-b67e-96cb347ad8fc", "provider": "mockpay", "created_at": "2025-09-16T17:47:32.502308+00:00", "provider_ref": "succeeded"}]}
41d7ba39-08b1-4384-8524-e79c59d5da81	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	1952	0	0	1952	EUR	2025-09-16 17:54:34.829046+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "ea15f740-6136-4f31-93f9-4c7b778fbc8b", "qty": 1, "meta": {}, "title": "срр", "total": 120, "order_id": "41d7ba39-08b1-4384-8524-e79c59d5da81", "product_id": "b8ddda86-1765-4e16-a88b-4a23cb29ae18", "unit_price": 120, "variant_id": null}, {"id": "a81872c0-0060-4757-b243-f0ec88ccdc53", "qty": 8, "meta": {}, "title": "Omega 27\\\\' Monitor", "total": 1832, "order_id": "41d7ba39-08b1-4384-8524-e79c59d5da81", "product_id": "03dbd39a-a6da-49a2-9047-820c4aeb9de9", "unit_price": 229, "variant_id": null}], "history": [{"amount": 1952, "status": "succeeded", "currency": "EUR", "order_id": "41d7ba39-08b1-4384-8524-e79c59d5da81", "created_at": "2025-09-16T17:54:34.829046+00:00"}], "refunds": [], "payments": [{"id": "8b5219c1-973f-4b30-8c09-11340a0e8257", "amount": 1952, "status": "authorized", "currency": "EUR", "order_id": "41d7ba39-08b1-4384-8524-e79c59d5da81", "provider": "mockpay", "created_at": "2025-09-16T17:54:40.670086+00:00", "provider_ref": "authorized"}, {"id": "bd9b2e4b-f374-427e-8ba5-fd981d46ac6e", "amount": 1952, "status": "succeeded", "currency": "EUR", "order_id": "41d7ba39-08b1-4384-8524-e79c59d5da81", "provider": "mockpay", "created_at": "2025-09-16T17:54:41.859918+00:00", "provider_ref": "succeeded"}]}
6c4bf4b0-f14b-4143-ac1d-cb70b0aa3e3c	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	120	0	0	120	EUR	2025-09-16 18:28:46.165238+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "7a9eb59e-3800-4a1b-866c-c766758ddefe", "qty": 1, "meta": {}, "title": "срр", "total": 120, "order_id": "6c4bf4b0-f14b-4143-ac1d-cb70b0aa3e3c", "product_id": "b8ddda86-1765-4e16-a88b-4a23cb29ae18", "unit_price": 120, "variant_id": null}], "history": [{"amount": 120, "status": "succeeded", "currency": "EUR", "order_id": "6c4bf4b0-f14b-4143-ac1d-cb70b0aa3e3c", "created_at": "2025-09-16T18:28:46.165238+00:00"}], "refunds": [], "payments": [{"id": "7ee4816e-2f98-480b-bc82-1435e024cb79", "amount": 120, "status": "authorized", "currency": "EUR", "order_id": "6c4bf4b0-f14b-4143-ac1d-cb70b0aa3e3c", "provider": "mockpay", "created_at": "2025-09-16T18:41:20.148862+00:00", "provider_ref": "authorized"}, {"id": "ecc5aebe-a195-461a-8c46-25b3aac2ef2f", "amount": 120, "status": "succeeded", "currency": "EUR", "order_id": "6c4bf4b0-f14b-4143-ac1d-cb70b0aa3e3c", "provider": "mockpay", "created_at": "2025-09-16T18:41:21.273009+00:00", "provider_ref": "succeeded"}]}
7d4baec4-fb85-4299-a241-b80bd9be46d8	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	120	0	0	120	EUR	2025-09-16 18:29:13.974408+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "13606834-d4bc-403c-a165-cfbe07af591f", "qty": 1, "meta": {}, "title": "срр", "total": 120, "order_id": "7d4baec4-fb85-4299-a241-b80bd9be46d8", "product_id": "b8ddda86-1765-4e16-a88b-4a23cb29ae18", "unit_price": 120, "variant_id": null}], "history": [{"amount": 120, "status": "succeeded", "currency": "EUR", "order_id": "7d4baec4-fb85-4299-a241-b80bd9be46d8", "created_at": "2025-09-16T18:29:13.974408+00:00"}], "refunds": [], "payments": [{"id": "1b8cea62-dfe0-487c-b429-531491faaed3", "amount": 120, "status": "authorized", "currency": "EUR", "order_id": "7d4baec4-fb85-4299-a241-b80bd9be46d8", "provider": "mockpay", "created_at": "2025-09-16T18:41:20.109554+00:00", "provider_ref": "authorized"}, {"id": "172a93b4-ff5e-4c88-bb3f-a819c04cad20", "amount": 120, "status": "succeeded", "currency": "EUR", "order_id": "7d4baec4-fb85-4299-a241-b80bd9be46d8", "provider": "mockpay", "created_at": "2025-09-16T18:41:21.188307+00:00", "provider_ref": "succeeded"}]}
b9140deb-3728-47c9-b460-b7ddfa3852db	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	360	0	0	360	EUR	2025-09-16 18:41:14.793787+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "deb2b68f-7afd-49fe-b66a-457fec0623ed", "qty": 3, "meta": {}, "title": "срр", "total": 360, "order_id": "b9140deb-3728-47c9-b460-b7ddfa3852db", "product_id": "b8ddda86-1765-4e16-a88b-4a23cb29ae18", "unit_price": 120, "variant_id": null}], "history": [{"amount": 360, "status": "succeeded", "currency": "EUR", "order_id": "b9140deb-3728-47c9-b460-b7ddfa3852db", "created_at": "2025-09-16T18:41:14.793787+00:00"}], "refunds": [], "payments": [{"id": "84da22f8-3b77-4327-ba90-39c2402fab90", "amount": 360, "status": "authorized", "currency": "EUR", "order_id": "b9140deb-3728-47c9-b460-b7ddfa3852db", "provider": "mockpay", "created_at": "2025-09-16T18:41:19.299921+00:00", "provider_ref": "authorized"}, {"id": "24f2c5da-3e10-4be5-88cd-7d78fbcdf61e", "amount": 360, "status": "succeeded", "currency": "EUR", "order_id": "b9140deb-3728-47c9-b460-b7ddfa3852db", "provider": "mockpay", "created_at": "2025-09-16T18:41:20.893158+00:00", "provider_ref": "succeeded"}]}
ae8e84c1-e61e-4a04-9649-30cb805618cd	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	paid	0	0	0	0	EUR	2025-09-17 18:19:05.548576+00	2025-09-18 16:10:14.334319+00	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [], "history": [{"amount": 0, "status": "pending", "currency": "EUR", "order_id": "ae8e84c1-e61e-4a04-9649-30cb805618cd", "created_at": "2025-09-17T18:19:05.548576+00:00"}], "refunds": [], "payments": [{"id": "23a1930f-2638-4000-aa35-063191567b20", "amount": 0, "status": "pending", "currency": "EUR", "order_id": "ae8e84c1-e61e-4a04-9649-30cb805618cd", "provider": "testpay", "created_at": "2025-10-04T18:37:08.769946+00:00", "provider_ref": "api-create"}]}
c63c10f1-2f08-4aa7-870d-98eca84d9a9c	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	1600	0	0	1600	EUR	2025-09-18 16:11:07.512183+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "21e4f8f2-2ca5-46a2-81e3-d80a9eddb9c9", "qty": 2, "meta": {}, "title": "phone", "total": 1600, "order_id": "c63c10f1-2f08-4aa7-870d-98eca84d9a9c", "product_id": "aa53e585-20af-4cb0-ae84-6fa208097ca2", "unit_price": 800, "variant_id": null}], "history": [{"amount": 1600, "status": "succeeded", "currency": "EUR", "order_id": "c63c10f1-2f08-4aa7-870d-98eca84d9a9c", "created_at": "2025-09-18T16:11:07.512183+00:00"}], "refunds": [], "payments": [{"id": "5d280fb7-abd3-4f3b-bc07-f6dd68b2de13", "amount": 1600, "status": "authorized", "currency": "EUR", "order_id": "c63c10f1-2f08-4aa7-870d-98eca84d9a9c", "provider": "mockpay", "created_at": "2025-09-18T16:11:16.073558+00:00", "provider_ref": "authorized"}, {"id": "1ee7053a-2ea5-4f26-ae25-6ffde2c265cc", "amount": 1600, "status": "succeeded", "currency": "EUR", "order_id": "c63c10f1-2f08-4aa7-870d-98eca84d9a9c", "provider": "mockpay", "created_at": "2025-09-18T16:11:16.465023+00:00", "provider_ref": "succeeded"}]}
cdb60908-f638-40b2-948f-79c6d011c0d4	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	authorized	200	0	0	200	EUR	2025-09-18 16:12:23.765245+00	2025-09-18 16:51:56.167003+00	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "ebff51fc-05a3-4a81-9bd8-cca273acbd62", "qty": 2, "meta": {}, "title": "хуй резиновый", "total": 200, "order_id": "cdb60908-f638-40b2-948f-79c6d011c0d4", "product_id": "80445305-ae28-4966-a4dd-1869cfcc5fd6", "unit_price": 100, "variant_id": null}], "history": [{"amount": 200, "status": "authorized", "currency": "EUR", "order_id": "cdb60908-f638-40b2-948f-79c6d011c0d4", "created_at": "2025-09-18T16:12:23.765245+00:00"}], "refunds": [], "payments": [{"id": "f74fbf94-407e-48d8-a2db-1ed491013714", "amount": 200, "status": "authorized", "currency": "EUR", "order_id": "cdb60908-f638-40b2-948f-79c6d011c0d4", "provider": "mockpay", "created_at": "2025-09-18T16:37:56.914593+00:00", "provider_ref": "authorized"}]}
64d45049-05b3-499c-a8a2-35c4d1692764	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	234	0	0	234	EUR	2025-09-18 17:01:55.390424+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "7344a5d0-3bb8-4f12-bd21-b6a596efb27a", "qty": 1, "meta": {}, "title": "колесо", "total": 234, "order_id": "64d45049-05b3-499c-a8a2-35c4d1692764", "product_id": "fd638237-ff31-4db5-b713-7130b054e9f9", "unit_price": 234, "variant_id": null}], "history": [{"amount": 234, "status": "succeeded", "currency": "EUR", "order_id": "64d45049-05b3-499c-a8a2-35c4d1692764", "created_at": "2025-09-18T17:01:55.390424+00:00"}], "refunds": [], "payments": [{"id": "817444eb-1bb0-4506-a6d8-3009ce30cace", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "64d45049-05b3-499c-a8a2-35c4d1692764", "provider": "mockpay", "created_at": "2025-09-18T17:01:57.590075+00:00", "provider_ref": "authorized"}, {"id": "a4d7b001-9f52-4346-be1f-c3e9e6db3998", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "64d45049-05b3-499c-a8a2-35c4d1692764", "provider": "mockpay", "created_at": "2025-09-18T17:01:59.091213+00:00", "provider_ref": "authorized"}, {"id": "341dadc0-1258-4a72-b3df-e79a82476a5d", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "64d45049-05b3-499c-a8a2-35c4d1692764", "provider": "mockpay", "created_at": "2025-09-18T17:03:29.17357+00:00", "provider_ref": "authorized"}, {"id": "c3f85284-3e52-49e7-9685-9161386cd01e", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "64d45049-05b3-499c-a8a2-35c4d1692764", "provider": "mockpay", "created_at": "2025-09-18T17:10:55.28246+00:00", "provider_ref": "authorized"}, {"id": "01a0bebc-5c0a-4a85-8804-3f7137e25195", "amount": 234, "status": "succeeded", "currency": "EUR", "order_id": "64d45049-05b3-499c-a8a2-35c4d1692764", "provider": "mockpay", "created_at": "2025-09-18T17:10:55.55586+00:00", "provider_ref": "succeeded"}, {"id": "5134c6a9-e762-4b79-81e2-8427470a8065", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "64d45049-05b3-499c-a8a2-35c4d1692764", "provider": "mockpay", "created_at": "2025-09-18T17:07:24.639173+00:00", "provider_ref": "authorized"}]}
e062c77b-7d23-4f5f-b64d-409e27c35cc8	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	234	0	0	234	EUR	2025-09-18 17:03:34.926166+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "9245da08-d567-44ac-aad2-42c4d5db11ac", "qty": 1, "meta": {}, "title": "колесо", "total": 234, "order_id": "e062c77b-7d23-4f5f-b64d-409e27c35cc8", "product_id": "fd638237-ff31-4db5-b713-7130b054e9f9", "unit_price": 234, "variant_id": null}], "history": [{"amount": 234, "status": "succeeded", "currency": "EUR", "order_id": "e062c77b-7d23-4f5f-b64d-409e27c35cc8", "created_at": "2025-09-18T17:03:34.926166+00:00"}], "refunds": [], "payments": [{"id": "9614fd46-6eb9-426f-a7ee-72eae39158db", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "e062c77b-7d23-4f5f-b64d-409e27c35cc8", "provider": "mockpay", "created_at": "2025-09-18T17:07:54.197158+00:00", "provider_ref": "authorized"}, {"id": "3f15d6a5-9223-4d1d-8702-76bc497c13e1", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "e062c77b-7d23-4f5f-b64d-409e27c35cc8", "provider": "mockpay", "created_at": "2025-09-18T17:10:53.758317+00:00", "provider_ref": "authorized"}, {"id": "37218652-3ae1-4ca3-af5d-59357090c326", "amount": 234, "status": "succeeded", "currency": "EUR", "order_id": "e062c77b-7d23-4f5f-b64d-409e27c35cc8", "provider": "mockpay", "created_at": "2025-09-18T17:10:54.08453+00:00", "provider_ref": "succeeded"}, {"id": "cf4f7a37-d2a7-41a4-98a1-06cf1ec24789", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "e062c77b-7d23-4f5f-b64d-409e27c35cc8", "provider": "mockpay", "created_at": "2025-09-18T17:06:48.376309+00:00", "provider_ref": "authorized"}, {"id": "0f93ab58-ace8-4fd7-94af-beb66449baf0", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "e062c77b-7d23-4f5f-b64d-409e27c35cc8", "provider": "mockpay", "created_at": "2025-09-18T17:07:14.597388+00:00", "provider_ref": "authorized"}]}
0ce61e7a-d708-4703-aafa-18c91dd4212c	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	229	0	0	229	EUR	2025-09-18 17:08:08.825852+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "88fe0db6-6dfd-42b6-a654-38b8f1b2daee", "qty": 1, "meta": {}, "title": "Omega 27\\\\' Monitor", "total": 229, "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "product_id": "03dbd39a-a6da-49a2-9047-820c4aeb9de9", "unit_price": 229, "variant_id": null}], "history": [{"amount": 229, "status": "succeeded", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "created_at": "2025-09-18T17:08:08.825852+00:00"}], "refunds": [], "payments": [{"id": "c752f444-fbb5-4f7d-9526-e6c621151b6e", "amount": 229, "status": "authorized", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "provider": "mockpay", "created_at": "2025-09-18T17:08:10.860889+00:00", "provider_ref": "authorized"}, {"id": "967e4550-9f27-477d-9d3e-a13e394cb8a9", "amount": 229, "status": "authorized", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "provider": "mockpay", "created_at": "2025-09-18T17:08:12.200415+00:00", "provider_ref": "authorized"}, {"id": "3743f4ec-0994-4923-815c-d5b99a012ed5", "amount": 229, "status": "authorized", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "provider": "mockpay", "created_at": "2025-09-18T17:09:14.04009+00:00", "provider_ref": "authorized"}, {"id": "99b35b27-2a1f-4351-8948-4aadda9d688d", "amount": 229, "status": "authorized", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "provider": "mockpay", "created_at": "2025-09-18T17:09:17.608217+00:00", "provider_ref": "authorized"}, {"id": "52e02cc3-4c20-4b3e-a755-8825a06e6d2d", "amount": 229, "status": "authorized", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "provider": "mockpay", "created_at": "2025-09-18T17:09:13.171203+00:00", "provider_ref": "authorized"}, {"id": "21872f72-8af5-44ce-bce3-8d7aae18c7aa", "amount": 229, "status": "authorized", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "provider": "mockpay", "created_at": "2025-09-18T17:09:14.78581+00:00", "provider_ref": "authorized"}, {"id": "bee8818e-205a-4f8e-a194-4327f9214b9a", "amount": 229, "status": "authorized", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "provider": "mockpay", "created_at": "2025-09-18T17:09:18.896721+00:00", "provider_ref": "authorized"}, {"id": "889177f8-9f2a-4afc-8e6a-f0ae576e71eb", "amount": 229, "status": "authorized", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "provider": "mockpay", "created_at": "2025-09-18T17:10:51.170516+00:00", "provider_ref": "authorized"}, {"id": "31606943-0c04-4ce3-81eb-e5555834c041", "amount": 229, "status": "succeeded", "currency": "EUR", "order_id": "0ce61e7a-d708-4703-aafa-18c91dd4212c", "provider": "mockpay", "created_at": "2025-09-18T17:10:51.514237+00:00", "provider_ref": "succeeded"}]}
3b2f25ad-5fb0-42b1-b8eb-3758c4264b78	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	failed	234	0	0	234	EUR	2025-09-18 17:11:18.541681+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "ea26dd6b-4d03-4618-8f8d-3e74cb20ba90", "qty": 1, "meta": {}, "title": "колесо", "total": 234, "order_id": "3b2f25ad-5fb0-42b1-b8eb-3758c4264b78", "product_id": "fd638237-ff31-4db5-b713-7130b054e9f9", "unit_price": 234, "variant_id": null}], "history": [{"amount": 234, "status": "failed", "currency": "EUR", "order_id": "3b2f25ad-5fb0-42b1-b8eb-3758c4264b78", "created_at": "2025-09-18T17:11:18.541681+00:00"}], "refunds": [], "payments": [{"id": "cf6b8b45-2425-449e-a059-5369e50d7cea", "amount": 234, "status": "authorized", "currency": "EUR", "order_id": "3b2f25ad-5fb0-42b1-b8eb-3758c4264b78", "provider": "mockpay", "created_at": "2025-09-18T17:11:22.238756+00:00", "provider_ref": "authorized"}, {"id": "9f4a2b12-c246-4191-87ef-c2c29b410753", "amount": 234, "status": "failed", "currency": "EUR", "order_id": "3b2f25ad-5fb0-42b1-b8eb-3758c4264b78", "provider": "mockpay", "created_at": "2025-09-18T17:11:22.517797+00:00", "provider_ref": "succeeded"}]}
c40ad1a6-fe08-4f6e-8a1e-7aec3fc8636d	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	1.24	0	0	1.24	EUR	2025-09-19 16:22:32.479503+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "089f3356-e411-4ebd-8b8d-f15cec429e30", "qty": 1, "meta": {}, "title": "dd", "total": 1.24, "order_id": "c40ad1a6-fe08-4f6e-8a1e-7aec3fc8636d", "product_id": "cc7d9c51-ff72-49e0-8a31-2b407c183287", "unit_price": 1.24, "variant_id": null}], "history": [{"amount": 1.24, "status": "succeeded", "currency": "EUR", "order_id": "c40ad1a6-fe08-4f6e-8a1e-7aec3fc8636d", "created_at": "2025-09-19T16:22:32.479503+00:00"}], "refunds": [], "payments": [{"id": "71c8df6a-99fc-4b3a-b47b-c43e034964a6", "amount": 1.24, "status": "authorized", "currency": "EUR", "order_id": "c40ad1a6-fe08-4f6e-8a1e-7aec3fc8636d", "provider": "mockpay", "created_at": "2025-09-19T16:22:35.690688+00:00", "provider_ref": "authorized"}, {"id": "c4344b54-bc9c-45be-a3c9-5ef9434dd9f3", "amount": 1.24, "status": "succeeded", "currency": "EUR", "order_id": "c40ad1a6-fe08-4f6e-8a1e-7aec3fc8636d", "provider": "mockpay", "created_at": "2025-09-19T16:22:35.974418+00:00", "provider_ref": "succeeded"}]}
8ced1b6b-e51e-49b5-acd9-87394ae037d5	4d52d1ee-b5c0-4857-a19c-c6d3ff439a7d	paid	succeeded	1.24	0	0	1.24	EUR	2025-09-19 16:37:59.372945+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "743258f4-074a-42bc-b03b-9ddfad9e0995", "qty": 1, "meta": {}, "title": "dd", "total": 1.24, "order_id": "8ced1b6b-e51e-49b5-acd9-87394ae037d5", "product_id": "cc7d9c51-ff72-49e0-8a31-2b407c183287", "unit_price": 1.24, "variant_id": null}], "history": [{"amount": 1.24, "status": "succeeded", "currency": "EUR", "order_id": "8ced1b6b-e51e-49b5-acd9-87394ae037d5", "created_at": "2025-09-19T16:37:59.372945+00:00"}], "refunds": [], "payments": [{"id": "bd7282f3-0a9c-49a8-af98-f9b751a0c97f", "amount": 1.24, "status": "authorized", "currency": "EUR", "order_id": "8ced1b6b-e51e-49b5-acd9-87394ae037d5", "provider": "mockpay", "created_at": "2025-09-19T16:38:02.255614+00:00", "provider_ref": "authorized"}, {"id": "cb938022-7240-4a3d-9972-f831c9f22503", "amount": 1.24, "status": "succeeded", "currency": "EUR", "order_id": "8ced1b6b-e51e-49b5-acd9-87394ae037d5", "provider": "mockpay", "created_at": "2025-09-19T16:38:02.545135+00:00", "provider_ref": "succeeded"}]}
1851390a-d9ca-4131-9c07-9ea51bc22278	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	1.58	0	0	1.58	EUR	2025-09-19 17:57:23.159791+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "7e7f9aa9-bc87-46ac-95c4-1a186e732c72", "qty": 1, "meta": {}, "title": "чайыы", "total": 1.58, "order_id": "1851390a-d9ca-4131-9c07-9ea51bc22278", "product_id": "d801d811-f3c8-438f-bc3e-f6fd9b8050a8", "unit_price": 1.58, "variant_id": null}], "history": [{"amount": 1.58, "status": "succeeded", "currency": "EUR", "order_id": "1851390a-d9ca-4131-9c07-9ea51bc22278", "created_at": "2025-09-19T17:57:23.159791+00:00"}], "refunds": [], "payments": [{"id": "3fed2cd9-fe28-48a0-a55d-34cd56cc0412", "amount": 1.58, "status": "authorized", "currency": "EUR", "order_id": "1851390a-d9ca-4131-9c07-9ea51bc22278", "provider": "mockpay", "created_at": "2025-09-19T17:57:25.967732+00:00", "provider_ref": "authorized"}, {"id": "50fdf6cd-4da2-4ec3-853a-fa70a684c714", "amount": 1.58, "status": "succeeded", "currency": "EUR", "order_id": "1851390a-d9ca-4131-9c07-9ea51bc22278", "provider": "mockpay", "created_at": "2025-09-19T17:57:26.262894+00:00", "provider_ref": "succeeded"}]}
c0b13bbf-a827-48ed-b32e-34fea174c1ee	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	1.21	0	0	1.21	EUR	2025-09-19 17:58:35.722335+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "0ca821ef-e376-46bc-9204-9c98c7c4230f", "qty": 1, "meta": {}, "title": "чай2", "total": 1.21, "order_id": "c0b13bbf-a827-48ed-b32e-34fea174c1ee", "product_id": "a1cf2a63-8d98-44c5-a81b-7d80461a4c6c", "unit_price": 1.21, "variant_id": null}], "history": [{"amount": 1.21, "status": "succeeded", "currency": "EUR", "order_id": "c0b13bbf-a827-48ed-b32e-34fea174c1ee", "created_at": "2025-09-19T17:58:35.722335+00:00"}], "refunds": [], "payments": [{"id": "55f9fba2-bdea-4416-9065-8fef87abf649", "amount": 1.21, "status": "authorized", "currency": "EUR", "order_id": "c0b13bbf-a827-48ed-b32e-34fea174c1ee", "provider": "mockpay", "created_at": "2025-09-19T17:58:38.038079+00:00", "provider_ref": "authorized"}, {"id": "d302ebd4-0a68-4c08-b739-137261469036", "amount": 1.21, "status": "succeeded", "currency": "EUR", "order_id": "c0b13bbf-a827-48ed-b32e-34fea174c1ee", "provider": "mockpay", "created_at": "2025-09-19T17:58:38.346976+00:00", "provider_ref": "succeeded"}]}
4b9f3b85-e118-442f-8c58-ec444ffd856e	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	succeeded	0.61	0	0	0.61	EUR	2025-09-19 19:25:13.496893+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "a5406028-a6b0-41ad-b410-e949817038c2", "qty": 1, "meta": {}, "title": "baba", "total": 0.61, "order_id": "4b9f3b85-e118-442f-8c58-ec444ffd856e", "product_id": "e6e5a932-4f1d-409f-b5fd-4b9033d6f5a5", "unit_price": 0.61, "variant_id": null}], "history": [{"amount": 0.61, "status": "succeeded", "currency": "EUR", "order_id": "4b9f3b85-e118-442f-8c58-ec444ffd856e", "created_at": "2025-09-19T19:25:13.496893+00:00"}], "refunds": [], "payments": [{"id": "ce4827ec-2a64-4d5d-a490-af8642e838b8", "amount": 0.61, "status": "authorized", "currency": "EUR", "order_id": "4b9f3b85-e118-442f-8c58-ec444ffd856e", "provider": "mockpay", "created_at": "2025-09-19T19:25:16.573297+00:00", "provider_ref": "authorized"}, {"id": "8272088c-946f-443f-a4da-4c00b52d82d2", "amount": 0.61, "status": "succeeded", "currency": "EUR", "order_id": "4b9f3b85-e118-442f-8c58-ec444ffd856e", "provider": "mockpay", "created_at": "2025-09-19T19:25:16.873526+00:00", "provider_ref": "succeeded"}]}
f8a3bb8e-75ee-42b7-8574-c76358051e17	db93c961-5f77-41d3-96d2-9b50eaabb3ab	paid	paid	10000	0	0	10000	EUR	2025-09-19 20:00:45.228768+00	\N	\N	{}	\N	{}	\N	\N	2025-10-21 22:29:37.124+00	db8cab40-4117-4550-887a-68bba4664f3c	{"items": [{"id": "53a689cd-5c44-4073-9c27-15d7fe101a45", "qty": 1, "meta": {}, "title": "хуй резиновый", "total": 10000, "order_id": "f8a3bb8e-75ee-42b7-8574-c76358051e17", "product_id": "0860cae1-9903-47b4-a072-06a6ffd84922", "unit_price": 10000, "variant_id": null}], "history": [{"amount": 10000, "status": "succeeded", "currency": "EUR", "order_id": "f8a3bb8e-75ee-42b7-8574-c76358051e17", "created_at": "2025-09-19T20:00:45.228768+00:00"}], "refunds": [], "payments": [{"id": "56ba81f0-2a59-4e03-8e79-2c3bf311855d", "amount": 10000, "status": "pending", "currency": "EUR", "order_id": "f8a3bb8e-75ee-42b7-8574-c76358051e17", "provider": "testpay", "created_at": "2025-10-04T18:21:56.18331+00:00", "provider_ref": "api-create"}, {"id": "ec7cb5d6-a955-459d-b7f8-955520d1853e", "amount": 10000, "status": "authorized", "currency": "EUR", "order_id": "f8a3bb8e-75ee-42b7-8574-c76358051e17", "provider": "mockpay", "created_at": "2025-09-19T20:00:48.698865+00:00", "provider_ref": "authorized"}, {"id": "cbc11f5c-7571-4f39-9dd8-2547901a2127", "amount": 10000, "status": "succeeded", "currency": "EUR", "order_id": "f8a3bb8e-75ee-42b7-8574-c76358051e17", "provider": "mockpay", "created_at": "2025-09-19T20:00:48.970149+00:00", "provider_ref": "succeeded"}, {"id": "b5f0044e-4b26-4c1e-b5c7-e6e445fb034f", "amount": 10000, "status": "pending", "currency": "EUR", "order_id": "f8a3bb8e-75ee-42b7-8574-c76358051e17", "provider": "testpay", "created_at": "2025-10-04T18:34:58.935206+00:00", "provider_ref": "api-create"}]}
\.


--
-- Data for Name: orders_archive_export; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders_archive_export (id, run_id, payload_url, created_at, size_bytes) FROM stdin;
2ae30921-9256-46c2-a1b9-0060c73b3d75	9a70cc21-ca5a-43c7-980b-76a349b2b9f7	storage://orders-archive/9a70cc21-ca5a-43c7-980b-76a349b2b9f7/orders.json	2025-10-21 22:09:50.486595+00	0
589e784a-586d-4a5a-84d1-418795554c72	3cbd5e42-5c95-4b8f-bb33-3688aab884cb	storage://orders-archive/3cbd5e42-5c95-4b8f-bb33-3688aab884cb/orders.json	2025-10-21 22:10:51.478661+00	0
892a4fe8-f28a-4fe6-818e-40963ef49195	2e19e91d-f0b5-484b-9d1b-200ef39a20e1	storage://orders-archive/2e19e91d-f0b5-484b-9d1b-200ef39a20e1/orders.json	2025-10-21 22:12:19.681057+00	0
a8387533-f5bc-458e-8ca2-b8dac27593fe	39c01acc-6779-41e9-a37b-cf997e891ad3	storage://orders-archive/39c01acc-6779-41e9-a37b-cf997e891ad3/orders.json	2025-10-21 22:29:30.760076+00	0
c1b85b63-5be1-44a2-bf70-fe3aa89bc8d3	db8cab40-4117-4550-887a-68bba4664f3c	storage://orders-archive/db8cab40-4117-4550-887a-68bba4664f3c/orders.json	2025-10-21 22:29:36.929223+00	0
\.


--
-- Data for Name: page_sections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.page_sections (id, page_path, locale, block_id, sort_order, is_draft, visible, published_at, created_at, created_by, updated_at, updated_by) FROM stdin;
6fc8392c-efaf-476e-9276-554855bc9ed6	/	ru	7f6bd9f2-97fb-42bd-81c7-73c74ade5bf7	0	f	t	2025-11-02 16:37:32.587113+00	2025-11-02 16:37:32.587113+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab	2025-11-02 16:37:32.587113+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, order_id, provider, provider_ref, amount, currency, status, created_at) FROM stdin;
e5f23f36-c43f-441d-a806-4569821b7583	8593f09b-b0d7-4d6f-9285-02928b9c7d98	stripe	pi_3SOifJDUDlhUOPHH0xCKpHkf	1230.00	EUR	failed	2025-11-01 17:32:37.634674+00
cc7af0b4-c21a-4a3e-adfd-a2451995b018	af21e154-c0ab-497a-8297-e7ea44743a1d	stripe	pi_3SOkFWDUDlhUOPHH1fmAawWs	1230.00	EUR	failed	2025-11-01 19:14:07.311183+00
a538bc4e-32d2-491f-b0f1-a49265009f3d	79b412de-67f6-4740-9d97-c3fecb4b553f	stripe	pi_3SOkHqDUDlhUOPHH181fBpeu	1230.00	EUR	failed	2025-11-01 19:16:30.557022+00
987bbb08-36ac-4bf1-b54b-792b36f10195	de90158d-b70b-4ffa-a5a7-3c3a7232279e	stripe	pi_3SOkRLDUDlhUOPHH1wGILEUb	1230.00	EUR	failed	2025-11-01 19:26:20.1298+00
15be8659-e5d6-4d9f-b3f1-300e60e81abc	e60fd539-3137-43f6-8698-4835528ae322	stripe	pi_3SOkZrDUDlhUOPHH1Pj41Vfq	1230.00	EUR	succeeded	2025-11-01 19:35:08.115103+00
2320b380-c965-48ee-80d6-ed8e00ab296b	755df648-772f-4fd1-8a91-a082f123b62c	stripe	pi_3SOkirDUDlhUOPHH1zw7kEym	1230.00	EUR	succeeded	2025-11-01 19:44:25.738855+00
a83d9f3f-f3e7-4399-bcea-881a4d91ec22	a0f08f0c-9d75-4923-a6e1-c92dfc079af6	stripe	pi_3SOkzZDUDlhUOPHH2f5vmHgK	1230.00	EUR	failed	2025-11-01 20:01:42.17095+00
22e07c72-cb11-4d9f-91a6-5f0542afd2ab	596b2f24-28e0-48c8-a12d-4ad883b3d898	stripe	pi_3SOl25DUDlhUOPHH3hmckuN6	1230.00	EUR	succeeded	2025-11-01 20:04:17.855006+00
be58fd2a-6f93-4bcd-a092-b506363e7ad1	9bc5192b-899c-410a-b658-9fd383375382	mockpay	succeeded	1230.00	EUR	succeeded	2025-11-01 20:21:24.036377+00
a5cb4966-98a3-4811-b496-557789773fad	93440a7a-b7b0-4d6a-80a2-470e9c4b1629	stripe	pi_3SOmQTDUDlhUOPHH27B9f88K	1230.00	EUR	failed	2025-11-01 21:33:33.97832+00
df34d397-7588-480e-9a99-5ce6acab0402	3aec1e48-ab52-4482-9d44-18d605c90aeb	stripe	pi_3SOmSsDUDlhUOPHH14TS6p3S	1230.00	EUR	failed	2025-11-01 21:36:02.84513+00
b022f461-571f-497a-9601-c9f4e1bd102e	365c7efd-a57a-479e-a5ed-a321c164eee7	stripe	pi_3SOmypDUDlhUOPHH0ZvRgfkM	1230.00	EUR	succeeded	2025-11-01 22:09:04.193591+00
\.


--
-- Data for Name: processed_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.processed_events (event_id, event_type, created_at) FROM stdin;
evt_3SOkZrDUDlhUOPHH1bkzuTcV	payment_intent.succeeded	2025-11-01 19:35:29.324833+00
evt_3SOkirDUDlhUOPHH1k75bR8O	payment_intent.succeeded	2025-11-01 19:44:46.44969+00
evt_3SOl25DUDlhUOPHH3oJhyTUM	payment_intent.succeeded	2025-11-01 20:04:33.517061+00
evt_3SOlEPDUDlhUOPHH3G0wOwas	payment_intent.succeeded	2025-11-01 20:17:26.043937+00
evt_3SOmypDUDlhUOPHH0UFLVTr9	payment_intent.succeeded	2025-11-01 22:09:21.723675+00
\.


--
-- Data for Name: product_impressions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_impressions (id, product_id, created_at, ip, user_agent, referrer, session_id, slug) FROM stdin;
\.


--
-- Data for Name: product_rating_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_rating_stats (product_uid, avg_rating, ratings_count, updated_at) FROM stdin;
147daaf1-9a9d-46a0-bca4-8b84076ee149	0.00	0	2025-11-04 10:34:09.269178+00
\.


--
-- Data for Name: product_reviews_raw; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_reviews_raw (product_id, user_id, rating, title, body, status, created_at, updated_at, id) FROM stdin;
147daaf1-9a9d-46a0-bca4-8b84076ee149	db93c961-5f77-41d3-96d2-9b50eaabb3ab	3	хороший товар	хороший товар , спасибо очень рад	pending	2025-11-01 16:51:14.377+00	2025-11-04 10:34:09.183472+00	445e43e1-ba82-4149-bb5e-df1138755b7a
\.


--
-- Data for Name: product_review_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_review_messages (id, product_id, root_review_id, parent_id, review_raw_id, author_id, author_role, body, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, updated_at, username, full_name, avatar_url, website) FROM stdin;
\.


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotions (id, slug, name, description, status, priority, combinable, stack_group, starts_at, ends_at, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: promotion_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotion_actions (id, promotion_id, kind, config, created_at) FROM stdin;
\.


--
-- Data for Name: promotion_conditions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotion_conditions (id, promotion_id, kind, config, created_at) FROM stdin;
\.


--
-- Data for Name: promotion_coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotion_coupons (id, promotion_id, code, usage_limit_total, usage_limit_per_user, starts_at, ends_at, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: promotion_usages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotion_usages (id, promotion_id, coupon_id, order_id, user_id, discount_amount, currency, context, applied_actions, created_at) FROM stdin;
\.


--
-- Data for Name: publish_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.publish_jobs (id, target, action, payload, status, attempts, last_error, scheduled_at, executed_at, created_by) FROM stdin;
3e0d51c9-ced4-4a86-95fe-9266bafddb1a	tag:content	revalidate	{"key": "header.title", "type": "site_setting", "locale": "ru"}	pending	0	\N	2025-11-02 17:24:49.658084+00	\N	\N
42b6db82-8357-4493-8c85-dda09d3f7734	tag:content	revalidate	{"key": "header.title", "type": "site_setting", "locale": "ru"}	pending	0	\N	2025-11-02 19:55:29.632712+00	\N	\N
13fd3d67-9f5f-4211-a4b2-122774920b2a	tag:content	revalidate	{"key": "header.title", "type": "translation", "locale": "ru", "namespace": "ui"}	pending	0	\N	2025-11-02 20:28:12.94204+00	\N	\N
df6a6703-0f3b-4b9f-a504-26286411a4b3	tag:content	revalidate	{}	pending	0	\N	2025-11-02 20:48:41.981708+00	\N	\N
\.


--
-- Data for Name: recent_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recent_views (id, user_id, anon_id, product_id, seen_at, weight) FROM stdin;
25f55eff-3e38-4aec-88b1-47491562cce1	\N	dcc4192e-7f63-4316-a511-e7031d0147a6	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 21:24:35.225+00	1
97873b61-af2e-49d4-979e-8ba67b5f24cf	\N	6f63e9b3-191d-4c9c-9222-fdc93600c3f1	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 21:25:17.661+00	1
d10a5eb9-8876-482b-bf42-cf40f3bb72ac	\N	707ff114-7f89-4840-91d7-e17f09aaad20	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 22:41:17.038+00	1
16c7adb0-43e3-41ec-8f7b-9a72eec0cdf9	\N	6ad5a25e-21ee-49c7-b732-f3f100aeb10e	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 21:25:33.05+00	1
e8ce6985-f074-49a0-b99a-13364d87f90f	\N	6f63e9b3-191d-4c9c-9222-fdc93600c3f1	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 21:32:15.281+00	1
b3229510-6d17-4699-9a70-aca34087f51c	\N	6ad5a25e-21ee-49c7-b732-f3f100aeb10e	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 23:16:43.21+00	1
abfead35-bbb7-4ec3-ba69-aaa84ad7270d	\N	fd7f6f9a-2403-4169-b7bb-f174241be60e	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-06 19:04:25.481+00	1
a223a2be-d10a-4e34-a0af-8287d7271044	\N	fd7f6f9a-2403-4169-b7bb-f174241be60e	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 17:32:49.521+00	1
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, expires_at, created_at, token_hash, user_agent, ip_address, metadata, revoked_at, revoked_reason, updated_at) FROM stdin;
\.


--
-- Data for Name: review_rate_limits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.review_rate_limits (ip_hash, last_at, count_24h, user_id) FROM stdin;
\.


--
-- Data for Name: review_votes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.review_votes (product_id, review_author_id, voter_id, value, created_at) FROM stdin;
\.


--
-- Data for Name: scheduled_content; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scheduled_content (id, target, payload, publish_at, created_by, created_at, processed_at) FROM stdin;
\.


--
-- Data for Name: shop_clicks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shop_clicks (id, product_id, created_at, ip, user_agent, referrer, session_id) FROM stdin;
\.


--
-- Data for Name: shop_impressions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shop_impressions (id, product_id, created_at, ip, user_agent, referrer, session_id) FROM stdin;
d12eae7a-f1e6-4998-83f1-5c327a452e58	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 16:49:51.201224+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
d3d9cb53-8495-48cb-b198-4e4aac00e7ca	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 16:50:40.58595+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
5cb81ef6-4fa8-44e0-a53e-8c4673feeea9	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 17:31:47.3174+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
b1e85545-c7d7-4ea9-9e69-94b4cf023eed	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 17:50:06.451985+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
6dd67f87-0a50-464b-bb41-bf4f42d8ac27	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 17:56:46.326634+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
52c302bd-a2b9-4487-8e8b-ef362554a4e6	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 18:51:31.183852+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
cae73058-23d6-4b19-a637-b2785c9e648c	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 18:54:04.811707+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
94ee3ab3-c6fb-4691-b6b1-63c4b0c865b3	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 18:54:39.132286+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
967625a7-2497-4c76-b093-dc3385cbd01b	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 21:24:22.180144+00	78.51.8.43	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	https://neon4-6bovxupzf-degs-projects-bf759307.vercel.app/products/iphone17-pro1	\N
d9962b6c-b2f1-459e-b505-976216322528	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 21:50:46.428242+00	37.19.218.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
542902a9-89ee-421b-b873-aa1a4487c64b	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 22:11:00.568709+00	37.19.218.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
58e3e0ed-d1e0-4a61-a811-4c956a64081b	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 22:28:52.716155+00	37.19.218.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
3a23737a-3e8f-4bd5-ab08-365bddf03564	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 22:41:17.470779+00	78.51.8.43	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	https://neon4.vercel.app/products/iphone17-pro1	\N
cac2ee5b-4295-4ddf-a9c4-c97b059ddef4	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 23:16:41.548555+00	37.19.218.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
d16ce579-6bba-429f-8f6f-397f86112554	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 23:41:07.41783+00	37.19.218.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
7b02afc1-6a35-4f94-825c-3b1c20159fe0	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 23:43:28.306718+00	37.19.218.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
d9b9fb99-5bf8-4fa3-8a29-eb4d983582af	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 23:49:05.84919+00	37.19.218.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
63ef3f12-5c47-4587-9bba-f8e88c0809ea	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 23:50:10.384548+00	37.19.218.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
895c1146-9fc1-4d91-9781-c928e665024d	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-01 23:50:46.270243+00	37.19.218.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
acf1dbf1-112a-4028-b1be-dc60f8f11ecf	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-02 00:10:13.12137+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
385f3d8d-49a0-48fb-8006-d821acd9f07e	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-02 12:53:34.26331+00	155.133.4.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
c1638916-a33c-4fb0-accb-37f29136f581	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-02 13:28:35.199473+00	155.133.4.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
7e90aec3-d310-43c0-8089-f7fc1b6bfef1	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-02 15:05:35.645517+00	155.133.4.8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
9861aa56-d8b5-4295-92aa-e09fc486aece	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-02 15:07:16.156987+00	155.133.4.8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
e13d2b98-1d87-427d-90b8-79f96cd981a3	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-04 10:32:38.97387+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
2ff7b824-0e31-451b-b1a1-de0e71c20c62	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 11:16:10.281604+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1-copy	\N
62e712d9-be8b-49f9-840c-f49340d65570	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 11:17:17.166917+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1-copy	\N
ecceb817-17a9-42f6-8b50-ed626c32d7da	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 11:48:49.140463+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
b35336f4-7d08-489e-b842-edfe2b59cb95	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 14:32:33.115079+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1-copy	\N
13ff1ee6-fde5-404c-9321-691da0fdca9e	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 15:00:31.490301+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
e6fae642-9fba-45a1-8b57-f8bc9939792d	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 15:02:46.342607+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
20ecceb8-5961-4c95-bf03-270a4a2912a1	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 15:02:54.063939+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
576f4669-6011-46ef-97bd-354ae10a5964	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 17:32:49.267364+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	http://localhost:3000/products/iphone17-pro1	\N
7f91ff3d-677a-4ae5-b402-ae691e7f0765	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 18:01:35.371691+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
1ce35359-7476-4c65-a335-33c36bd3943b	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 18:03:05.917831+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1-copy	\N
92341496-fb16-420c-8124-a076bbb76312	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 18:20:06.312134+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
6e16b296-6064-408a-b192-36d658c529b9	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 19:01:10.111095+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
815ed81d-6a50-4f28-ba54-5c035737c2cd	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 19:01:46.843828+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
30386298-741b-458a-87fe-0ce3195eeb54	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 19:01:54.810816+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1-copy	\N
a4166ff1-be86-4f7c-9300-77b98ec60854	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 20:10:00.024708+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
d3a31bd9-2a9b-465c-bb12-42be157a82b3	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 20:10:06.042712+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1-copy	\N
b780f27a-3071-421b-b395-324aae2534a8	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 20:10:22.954492+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
3766d12d-02ad-43a8-9da3-faf373a24644	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 20:17:52.454712+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1-copy	\N
ff086718-ecfb-433d-a966-4a49c397c3d6	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 20:17:56.886445+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
d40b527a-4bfc-4959-9651-8107d3f6a124	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 20:39:04.825942+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
7bee9fe5-7f84-4908-a094-5f50c89fb6bf	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 20:40:30.034158+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
cacb9526-caea-437f-aafc-a19227a97270	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 21:04:47.032831+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
ef18e73e-d1cc-464b-a575-d70c23b4b40f	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 21:05:27.934465+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
eb585cfa-acc1-4d83-841c-d8688992b1bb	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 21:10:56.672121+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1-copy	\N
d5ace32e-5bd2-472b-bafa-3faaa217cb79	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 21:12:55.703138+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1-copy	\N
57247bc5-3bf7-429a-8aa6-60d449cdf13c	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 21:14:42.555009+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
f355c960-2c98-4251-9da2-8fabc06fc270	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 21:20:44.28256+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
b76c8b6c-2941-4212-82a6-d30c34e6796a	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 21:20:46.491997+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
13ce13e8-4cf9-4a12-97ae-94e0c0f85f4c	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 21:25:18.2606+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1	\N
a233d316-e212-4e97-843b-a2af8c4790a8	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 21:25:22.445076+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1-copy	\N
204e0830-9a95-4e58-9c7f-e9636b4e7493	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 21:25:29.858694+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
fa0601ad-1ff1-46b9-b74b-17b2dbb337cb	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 21:25:32.562878+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1-copy	\N
e3fe832e-16ab-4fe9-bcc3-03217af219f3	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-05 21:32:15.047385+00	78.51.20.67	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	https://neon4.vercel.app/products/iphone17-pro1-copy	\N
8e8871dd-e9fd-47cb-be6d-f9733d344571	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 21:32:17.84824+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
3265885e-51bb-4feb-97f5-ce6f56f47947	147daaf1-9a9d-46a0-bca4-8b84076ee149	2025-11-05 23:16:42.830592+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	http://localhost:3000/products/iphone17-pro1	\N
87e18abb-ad0e-46a1-b3b7-1632889a21f6	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-06 18:56:41.082803+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	http://localhost:3000/products/iphone17-pro1-copy	\N
07aea4fa-fc5e-4386-886c-e019557bd055	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-06 18:59:30.006459+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	http://localhost:3000/products/iphone17-pro1-copy	\N
f0b04e97-fc20-40e5-b8f3-cb32d95e9b68	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-06 18:59:31.918636+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	http://localhost:3000/products	\N
5700790e-1a61-4173-8c67-cfc1b59b4ff8	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-06 19:02:30.770324+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	http://localhost:3000/products/iphone17-pro1-copy	\N
eb8bb7bf-cf3e-4168-bce8-ac95feb4d765	86a59b18-a8e2-4fb7-ab0f-168a215cdec6	2025-11-06 19:04:26.64368+00	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	http://localhost:3000/products/iphone17-pro1-copy	\N
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_settings (key, locale, value_json, is_public, updated_at, updated_by) FROM stdin;
debug.test	en	{"test": "ok"}	t	2025-11-02 19:25:42.737714+00	\N
1	en	""	t	2025-11-02 20:27:46.295147+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab
1	ru	""	t	2025-11-02 20:33:13.407465+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab
\.


--
-- Data for Name: stock_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_items (product_id, qty_available, updated_at) FROM stdin;
147daaf1-9a9d-46a0-bca4-8b84076ee149	-4	2025-11-01 22:09:22.770262+00
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_movements (id, order_id, order_item_id, product_id, qty_delta, reason, created_at) FROM stdin;
1	e60fd539-3137-43f6-8698-4835528ae322	b8d45228-07c2-4640-81f7-5c708eb6b434	147daaf1-9a9d-46a0-bca4-8b84076ee149	-1	sold	2025-11-01 20:12:05.868695+00
2	596b2f24-28e0-48c8-a12d-4ad883b3d898	2e5d0ad4-b919-4546-a367-afc0aa8115a1	147daaf1-9a9d-46a0-bca4-8b84076ee149	-1	sold	2025-11-01 20:12:05.868695+00
7	9bc5192b-899c-410a-b658-9fd383375382	01283c66-cdcd-449c-ba74-569e5ebeecbe	147daaf1-9a9d-46a0-bca4-8b84076ee149	-1	sold	2025-11-01 20:21:24.036377+00
8	365c7efd-a57a-479e-a5ed-a321c164eee7	a9b4838f-2048-474b-8e72-6d7fb6bc75d2	147daaf1-9a9d-46a0-bca4-8b84076ee149	-1	sold	2025-11-01 22:09:22.770262+00
\.


--
-- Data for Name: stripe_balance_transactions_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stripe_balance_transactions_cache (id, amount, currency, fee, net, status, type, created, attrs, updated_at) FROM stdin;
\.


--
-- Data for Name: stripe_charges_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stripe_charges_cache (id, customer, amount, currency, description, invoice, payment_intent, status, created, email, name, updated_at) FROM stdin;
\.


--
-- Data for Name: stripe_customers_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stripe_customers_cache (id, email, name, description, created, attrs, updated_at) FROM stdin;
\.


--
-- Data for Name: stripe_products_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stripe_products_cache (id, name, active, default_price, description, created, updated, attrs, created_at, updated_at, is_public) FROM stdin;
\.


--
-- Data for Name: stripe_webhooks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stripe_webhooks (id, type, livemode, api_version, created_utc, data, raw, inserted_at, mismatch_reason, expected_amount_cents, expected_currency, stripe_amount_cents, stripe_currency, processing_state, processing_error, notified_succeeded, notified_failed, notified_refunded, notified_desync, notified_requires_action) FROM stdin;
\.


--
-- Data for Name: stripe_webhooks_failed; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stripe_webhooks_failed (id, type, livemode, api_version, created_utc, data, raw, inserted_at, surrogate_id) FROM stdin;
\.


--
-- Data for Name: title_blacklist; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.title_blacklist (pattern) FROM stdin;
\.


--
-- Data for Name: total_is_generated; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.total_is_generated ("coalesce", id) FROM stdin;
\.


--
-- Data for Name: translations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.translations (id, locale, tkey, value_text, value_json, namespace, updated_at, updated_by) FROM stdin;
134a70ac-c3f2-4e57-affe-b06a2cf24629	ru	header.title	Магазин	\N	ui	2025-11-02 20:28:12.234409+00	db93c961-5f77-41d3-96d2-9b50eaabb3ab
\.


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, true);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 64, true);


--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_user_groups_id_seq', 1, false);


--
-- Name: auth_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_user_id_seq', 1, true);


--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_user_user_permissions_id_seq', 1, false);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 9, true);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 16, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 18, true);


--
-- Name: job_runs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_runs_id_seq', 1, false);


--
-- Name: line_total_is_generated_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.line_total_is_generated_id_seq', 1, false);


--
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.offers_id_seq', 20, true);


--
-- Name: order_status_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_status_audit_id_seq', 21, true);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_movements_id_seq', 8, true);


--
-- Name: stripe_webhooks_failed_surrogate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stripe_webhooks_failed_surrogate_id_seq', 1, false);


--
-- Name: total_is_generated_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.total_is_generated_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict Ax38oSUZMXC09tLiJoWlhdMzRNi0uHi7ugu9X2gOUngawb98gmfA8hZRBPdSbSM
