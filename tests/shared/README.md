# Shared Module Unit Tests

Unit tests for `udonfi-shared` are located inline inside their respective source files using `#[cfg(test)]` modules:

- Bit-mask packing tests: [bitmap.rs](file:///d:/TheAnhProject/UdonFi/contracts/shared/utils/bitmap.rs)
- Fixed-point math tests: [fixed_point.rs](file:///d:/TheAnhProject/UdonFi/contracts/shared/math/fixed_point.rs)
- Rounding direction tests: [rounding.rs](file:///d:/TheAnhProject/UdonFi/contracts/shared/math/rounding.rs)
- Configuration parameter tests: [validation.rs](file:///d:/TheAnhProject/UdonFi/contracts/shared/math/validation.rs)
- General checks validation tests: [validation.rs](file:///d:/TheAnhProject/UdonFi/contracts/shared/validation.rs)
- TTL and ledger sequence helper tests: [ttl.rs](file:///d:/TheAnhProject/UdonFi/contracts/shared/utils/ttl.rs) and [ledger.rs](file:///d:/TheAnhProject/UdonFi/contracts/shared/utils/ledger.rs)

To run the shared unit tests, navigate to the `contracts/shared` directory or root and run:
```bash
cargo test -p udonfi-shared
```
