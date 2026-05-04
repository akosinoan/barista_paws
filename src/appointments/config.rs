use chrono::{NaiveTime, Timelike};

/// Business open hour (inclusive), 24h clock.
pub const OPEN_HOUR: u32 = 9;
/// Business close hour (exclusive), 24h clock.
pub const CLOSE_HOUR: u32 = 18;
/// Slot length in minutes.
pub const SLOT_MINUTES: u32 = 30;

pub fn all_slots() -> Vec<NaiveTime> {
    let mut slots = Vec::new();
    let total_minutes = (CLOSE_HOUR - OPEN_HOUR) * 60;
    let mut offset = 0u32;
    while offset < total_minutes {
        let hour = OPEN_HOUR + offset / 60;
        let minute = offset % 60;
        if let Some(t) = NaiveTime::from_hms_opt(hour, minute, 0) {
            slots.push(t);
        }
        offset += SLOT_MINUTES;
    }
    slots
}

pub fn is_valid_slot(t: NaiveTime) -> bool {
    if t.second() != 0 {
        return false;
    }
    let hour = t.hour();
    let minute = t.minute();
    if !(OPEN_HOUR..CLOSE_HOUR).contains(&hour) {
        return false;
    }
    minute.is_multiple_of(SLOT_MINUTES)
}
