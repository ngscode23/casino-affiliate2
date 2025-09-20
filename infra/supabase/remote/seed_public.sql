SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

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
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ecom_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."ecom_categories" ("id", "slug", "name", "icon", "created_at") VALUES
	('46995675-0143-4827-b8b7-320bc836bf26', 'electronics', 'Electronics', 'Cpu', '2025-09-08 12:36:13.64594+00'),
	('f1f71606-133d-479c-a80b-d5b503b726f5', 'gaming', 'Gaming', 'Gamepad2', '2025-09-08 12:36:13.64594+00'),
	('eaed4c73-141d-4ddf-abb5-6f1e6677e510', 'accessories', 'Accessories', 'Headphones', '2025-09-08 12:36:13.64594+00'),
	('2be8525a-ad49-4903-9427-e0d2e00fc6bf', 'home', 'Home', 'Home', '2025-09-08 12:36:13.64594+00'),
	('3cc92d71-9db9-4919-8c96-41385f5c44c8', 'outdoors', 'Outdoors', 'Tent', '2025-09-08 12:36:13.64594+00'),
	('d71d1b2a-982c-4246-962e-bd55e0c25626', 'software', 'Software', 'Box', '2025-09-08 12:36:13.64594+00');


--
-- Data for Name: ecom_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."ecom_products" ("id", "slug", "title", "price", "rating", "images", "category_slug", "tags", "short_desc", "specs", "created_at") VALUES
	('b370b425-3732-4311-b65d-044adf205e31', 'alpha-headphones', 'Alpha Headphones', 79.99, 4.4, '["https://via.placeholder.com/800x500?text=Alpha"]', 'accessories', '{audio,wireless}', 'Comfortable over-ear wireless headphones.', '{"Connectivity": "Bluetooth 5.2"}', '2025-09-08 12:36:13.64594+00'),
	('ec2db82a-5df4-40f9-ae91-4643a88d6363', 'beta-keyboard', 'Beta Mechanical Keyboard', 59.99, 4.2, '["https://via.placeholder.com/800x500?text=Keyboard"]', 'accessories', '{keyboard}', 'Compact 75% mechanical keyboard with RGB.', '{"Switches": "Brown"}', '2025-09-08 12:36:13.64594+00'),
	('ae5ecb4d-e4f8-42b1-95b3-08dd11f34ce2', 'gamma-mouse', 'Gamma Gaming Mouse', 39.99, 4.1, '["https://via.placeholder.com/800x500?text=Mouse"]', 'gaming', '{mouse}', 'Lightweight mouse with precise sensor.', '{"DPI": "16000"}', '2025-09-08 12:36:13.64594+00'),
	('5644a0f5-d806-4205-806e-c2db41a63f4b', 'omega-monitor', 'Omega 27\'' Monitor', 229.00, 4.6, '["https://via.placeholder.com/800x500?text=Monitor"]', 'electronics', '{display}', '27-inch 144Hz IPS monitor.', '{"Refresh": "144Hz"}', '2025-09-08 12:36:13.64594+00'),
	('ffa6a259-1276-4cbc-9b56-d00ccdcdc0e2', 'delta-speaker', 'Delta Bluetooth Speaker', 45.00, 4, '["https://via.placeholder.com/800x500?text=Speaker"]', 'electronics', '{audio}', 'Portable speaker with rich sound.', '{"Battery": "12h"}', '2025-09-08 12:36:13.64594+00'),
	('424074d8-8a04-475a-965f-afcfee85a3a1', 'epsilon-smartlight', 'Epsilon Smart Light', 19.99, 3.9, '["https://via.placeholder.com/800x500?text=Light"]', 'home', '{light}', 'Smart LED bulb with app control.', '{"Socket": "E27"}', '2025-09-08 12:36:13.64594+00');


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: coupon_redemptions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ecom_wishlist; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: reviews__backup_20250909_181553; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."audit_log_id_seq"', 1, false);


--
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."offers_id_seq"', 20, true);


--
-- PostgreSQL database dump complete
--

RESET ALL;
