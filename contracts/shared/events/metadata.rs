//! Compact reusable event metadata.

use crate::events::EventModule;
use crate::{PoolId, ReserveId};
use soroban_sdk::{contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventMetadata {
    pub reserve_id: Option<u32>,
    pub asset_address: Option<Address>,
    pub pool_id: Option<Address>,
    pub config_version: Option<u32>,
    pub emergency: bool,
    pub source_module: EventModule,
    pub reason: Option<String>,
}

impl EventMetadata {
    pub fn new(source_module: EventModule) -> Self {
        Self {
            reserve_id: None,
            asset_address: None,
            pool_id: None,
            config_version: None,
            emergency: false,
            source_module,
            reason: None,
        }
    }

    pub fn with_reserve_id(mut self, reserve_id: ReserveId) -> Self {
        self.reserve_id = Some(reserve_id.0);
        self
    }

    pub fn with_asset_address(mut self, asset_address: Address) -> Self {
        self.asset_address = Some(asset_address);
        self
    }

    pub fn with_pool_id(mut self, pool_id: PoolId) -> Self {
        self.pool_id = Some(pool_id.0);
        self
    }

    pub fn with_config_version(mut self, config_version: u32) -> Self {
        self.config_version = Some(config_version);
        self
    }

    pub fn with_emergency(mut self, emergency: bool) -> Self {
        self.emergency = emergency;
        self
    }

    pub fn with_reason(mut self, reason: String) -> Self {
        self.reason = Some(reason);
        self
    }
}

pub fn create_event_metadata(source_module: EventModule) -> EventMetadata {
    EventMetadata::new(source_module)
}

pub fn empty_reason(env: &Env) -> String {
    String::from_str(env, "")
}
