use std::net::IpAddr;

use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use sha2::{Digest, Sha256};
use uuid::Uuid;

pub struct SignedWaiverInputs<'a> {
    pub appointment_id: Uuid,
    pub user_id: Uuid,
    pub template_id: Uuid,
    pub template_version: i32,
    pub body_sha256: &'a str,
    pub full_name: &'a str,
    pub consent: bool,
    pub pet_ids: &'a [Uuid],
    pub pet_names: &'a [String],
    pub appointment_date: NaiveDate,
    pub time_slot: NaiveTime,
    pub signed_at: DateTime<Utc>,
    pub ip: IpAddr,
    pub user_agent: &'a str,
    pub timezone: &'a str,
    pub notes: Option<&'a str>,
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    hex::encode(h.finalize())
}

pub fn canonicalize(s: &SignedWaiverInputs<'_>) -> String {
    let pet_ids = s
        .pet_ids
        .iter()
        .map(|u| u.to_string())
        .collect::<Vec<_>>()
        .join(",");
    let pet_names = s.pet_names.join("|");
    let notes_sha = sha256_hex(s.notes.unwrap_or("").as_bytes());
    format!(
        "v2\nappointment_id={}\nuser_id={}\ntemplate_id={}\ntemplate_version={}\n\
         body_sha256={}\nfull_name={}\nconsent={}\n\
         appointment_date={}\ntime_slot={}\npet_ids={}\npet_names={}\n\
         signed_at={}\nip={}\nua={}\ntz={}\nnotes_sha256={}",
        s.appointment_id,
        s.user_id,
        s.template_id,
        s.template_version,
        s.body_sha256,
        s.full_name.trim(),
        s.consent,
        s.appointment_date,
        s.time_slot.format("%H:%M:%S"),
        pet_ids,
        pet_names,
        s.signed_at.to_rfc3339(),
        s.ip,
        s.user_agent,
        s.timezone,
        notes_sha,
    )
}

pub fn payload_hash(s: &SignedWaiverInputs<'_>) -> String {
    sha256_hex(canonicalize(s).as_bytes())
}
