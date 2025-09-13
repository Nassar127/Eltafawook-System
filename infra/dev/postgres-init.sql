create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

do $$
begin
  if not exists (select from pg_roles where rolname = 'eltfawook') then
    create role eltfawook login password 'eltfawook';
  end if;
end$$;

grant connect on database app to eltfawook;
grant usage on schema public to eltfawook;
grant all on all tables in schema public to eltfawook;
alter default privileges in schema public grant all on tables to eltfawook;
alter default privileges in schema public grant all on sequences to eltfawook;

-- Create once via migration
CREATE OR REPLACE VIEW inventory_view AS
WITH onhand AS (
  SELECT branch_id, item_id, COALESCE(SUM(qty), 0) AS on_hand
  FROM stock_ledger
  -- reserve_hold/release should be qty=0; only real stock movements affect on_hand
  GROUP BY branch_id, item_id
),
reserved AS (
  SELECT branch_id, item_id, COALESCE(SUM(qty), 0) AS reserved
  FROM reservations
  WHERE status IN ('hold','active')  -- not fulfilled/cancelled/expired
  GROUP BY branch_id, item_id
)
SELECT
  COALESCE(o.branch_id, r.branch_id) AS branch_id,
  COALESCE(o.item_id,  r.item_id)    AS item_id,
  COALESCE(o.on_hand, 0) AS on_hand,
  COALESCE(r.reserved, 0) AS reserved,
  (COALESCE(o.on_hand,0) - COALESCE(r.reserved,0)) AS available
FROM onhand o
FULL OUTER JOIN reserved r
  ON r.branch_id=o.branch_id AND r.item_id=o.item_id;
