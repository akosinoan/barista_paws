use chrono::{NaiveTime, Timelike};

use crate::models::business_hours::BusinessHours;

/// Default business open hour (inclusive), 24h clock. Used only by the migration seed.
pub const DEFAULT_OPEN_HOUR: u32 = 9;
/// Default business close hour (exclusive), 24h clock. Used only by the migration seed.
pub const DEFAULT_CLOSE_HOUR: u32 = 18;
/// Default slot length in minutes. Used only by the migration seed.
pub const DEFAULT_SLOT_MINUTES: u32 = 30;

/// Generate all valid slots within the configured business hours.
pub fn all_slots(bh: &BusinessHours) -> Vec<NaiveTime> {
    let mut slots = Vec::new();
    let step = bh.slot_minutes.max(1) as u32;
    let start = bh.open_time.hour() * 60 + bh.open_time.minute();
    let end = bh.close_time.hour() * 60 + bh.close_time.minute();
    let mut cur = start;
    while cur < end {
        let h = cur / 60;
        let m = cur % 60;
        if let Some(t) = NaiveTime::from_hms_opt(h, m, 0) {
            slots.push(t);
        }
        cur += step;
    }
    slots
}

/// True if `t` aligns with the configured business hours window and slot interval.
pub fn is_valid_slot(bh: &BusinessHours, t: NaiveTime) -> bool {
    if t.second() != 0 {
        return false;
    }
    let step = bh.slot_minutes.max(1) as u32;
    let start = bh.open_time.hour() * 60 + bh.open_time.minute();
    let end = bh.close_time.hour() * 60 + bh.close_time.minute();
    let minute_of_day = t.hour() * 60 + t.minute();
    if minute_of_day < start || minute_of_day >= end {
        return false;
    }
    (minute_of_day - start).is_multiple_of(step)
}
