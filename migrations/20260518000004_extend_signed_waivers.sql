ALTER TABLE signed_waivers
    ADD COLUMN appointment_date     DATE,
    ADD COLUMN time_slot            TIME,
    ADD COLUMN pet_names_snapshot   TEXT[];
