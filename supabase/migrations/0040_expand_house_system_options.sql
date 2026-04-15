-- Expand house_system check constraint to include all 7 supported systems
alter table charts
  drop constraint if exists charts_house_system_check;

alter table charts
  add constraint charts_house_system_check
    check (house_system in ('placidus', 'koch', 'equal', 'whole_sign', 'porphyry', 'regiomontanus', 'campanus'));
