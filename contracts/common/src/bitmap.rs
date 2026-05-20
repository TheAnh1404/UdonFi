//! Bitmap module for compact user configuration storage.
//!
//! Each user's collateral/borrowing state is encoded in a single u128 integer.
//! Each reserve occupies 2 bits:
//!   - Bit 0: Using as collateral
//!   - Bit 1: Currently borrowing
//!
//! This allows tracking up to 64 reserves per user in a single storage slot,
//! minimizing ledger I/O costs on Soroban.

/// Maximum number of reserves supported (64 reserves × 2 bits = 128 bits = u128)
pub const MAX_RESERVES: u8 = 64;

/// Bit offset for collateral flag within a reserve's 2-bit slot
const COLLATERAL_BIT_OFFSET: u8 = 0;

/// Bit offset for borrowing flag within a reserve's 2-bit slot
const BORROWING_BIT_OFFSET: u8 = 1;

/// Bits per reserve slot
const BITS_PER_RESERVE: u8 = 2;

/// Check if user is using the given reserve as collateral.
///
/// # Arguments
/// * `bitmap` - The user's configuration bitmap (u128)
/// * `reserve_index` - Index of the reserve (0-63)
///
/// # Returns
/// `true` if the collateral flag is set for this reserve
pub fn is_using_as_collateral(bitmap: u128, reserve_index: u8) -> bool {
    if reserve_index >= MAX_RESERVES {
        return false;
    }
    let bit_position = (reserve_index * BITS_PER_RESERVE) + COLLATERAL_BIT_OFFSET;
    (bitmap >> bit_position) & 1 == 1
}

/// Check if user is currently borrowing from the given reserve.
///
/// # Arguments
/// * `bitmap` - The user's configuration bitmap (u128)
/// * `reserve_index` - Index of the reserve (0-63)
///
/// # Returns
/// `true` if the borrowing flag is set for this reserve
pub fn is_borrowing(bitmap: u128, reserve_index: u8) -> bool {
    if reserve_index >= MAX_RESERVES {
        return false;
    }
    let bit_position = (reserve_index * BITS_PER_RESERVE) + BORROWING_BIT_OFFSET;
    (bitmap >> bit_position) & 1 == 1
}

/// Set or clear the collateral flag for a reserve.
///
/// # Arguments
/// * `bitmap` - Mutable reference to the user's configuration bitmap
/// * `reserve_index` - Index of the reserve (0-63)
/// * `value` - `true` to set, `false` to clear
pub fn set_using_as_collateral(bitmap: &mut u128, reserve_index: u8, value: bool) {
    if reserve_index >= MAX_RESERVES {
        return;
    }
    let bit_position = (reserve_index * BITS_PER_RESERVE) + COLLATERAL_BIT_OFFSET;
    if value {
        *bitmap |= 1u128 << bit_position;
    } else {
        *bitmap &= !(1u128 << bit_position);
    }
}

/// Set or clear the borrowing flag for a reserve.
///
/// # Arguments
/// * `bitmap` - Mutable reference to the user's configuration bitmap
/// * `reserve_index` - Index of the reserve (0-63)
/// * `value` - `true` to set, `false` to clear
pub fn set_borrowing(bitmap: &mut u128, reserve_index: u8, value: bool) {
    if reserve_index >= MAX_RESERVES {
        return;
    }
    let bit_position = (reserve_index * BITS_PER_RESERVE) + BORROWING_BIT_OFFSET;
    if value {
        *bitmap |= 1u128 << bit_position;
    } else {
        *bitmap &= !(1u128 << bit_position);
    }
}

/// Check if user has any active collateral positions.
pub fn has_any_collateral(bitmap: u128) -> bool {
    for i in 0..MAX_RESERVES {
        if is_using_as_collateral(bitmap, i) {
            return true;
        }
    }
    false
}

/// Check if user has any active borrow positions.
pub fn has_any_borrows(bitmap: u128) -> bool {
    for i in 0..MAX_RESERVES {
        if is_borrowing(bitmap, i) {
            return true;
        }
    }
    false
}

/// Count the number of active collateral positions.
pub fn count_collateral_positions(bitmap: u128) -> u8 {
    let mut count = 0u8;
    for i in 0..MAX_RESERVES {
        if is_using_as_collateral(bitmap, i) {
            count += 1;
        }
    }
    count
}

/// Count the number of active borrow positions.
pub fn count_borrow_positions(bitmap: u128) -> u8 {
    let mut count = 0u8;
    for i in 0..MAX_RESERVES {
        if is_borrowing(bitmap, i) {
            count += 1;
        }
    }
    count
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_bitmap() {
        let bitmap: u128 = 0;
        assert!(!is_using_as_collateral(bitmap, 0));
        assert!(!is_borrowing(bitmap, 0));
        assert!(!has_any_collateral(bitmap));
        assert!(!has_any_borrows(bitmap));
    }

    #[test]
    fn test_set_collateral() {
        let mut bitmap: u128 = 0;
        set_using_as_collateral(&mut bitmap, 0, true);
        assert!(is_using_as_collateral(bitmap, 0));
        assert!(!is_borrowing(bitmap, 0));
        assert!(!is_using_as_collateral(bitmap, 1));
    }

    #[test]
    fn test_set_borrowing() {
        let mut bitmap: u128 = 0;
        set_borrowing(&mut bitmap, 0, true);
        assert!(!is_using_as_collateral(bitmap, 0));
        assert!(is_borrowing(bitmap, 0));
    }

    #[test]
    fn test_multiple_reserves() {
        let mut bitmap: u128 = 0;

        // Reserve 0: collateral only
        set_using_as_collateral(&mut bitmap, 0, true);

        // Reserve 1: borrowing only
        set_borrowing(&mut bitmap, 1, true);

        // Reserve 2: both collateral and borrowing
        set_using_as_collateral(&mut bitmap, 2, true);
        set_borrowing(&mut bitmap, 2, true);

        assert!(is_using_as_collateral(bitmap, 0));
        assert!(!is_borrowing(bitmap, 0));

        assert!(!is_using_as_collateral(bitmap, 1));
        assert!(is_borrowing(bitmap, 1));

        assert!(is_using_as_collateral(bitmap, 2));
        assert!(is_borrowing(bitmap, 2));

        assert_eq!(count_collateral_positions(bitmap), 2);
        assert_eq!(count_borrow_positions(bitmap), 2);
    }

    #[test]
    fn test_clear_flags() {
        let mut bitmap: u128 = 0;
        set_using_as_collateral(&mut bitmap, 5, true);
        set_borrowing(&mut bitmap, 5, true);
        assert!(is_using_as_collateral(bitmap, 5));
        assert!(is_borrowing(bitmap, 5));

        set_using_as_collateral(&mut bitmap, 5, false);
        assert!(!is_using_as_collateral(bitmap, 5));
        assert!(is_borrowing(bitmap, 5)); // Borrowing still set
    }

    #[test]
    fn test_max_reserve_index() {
        let mut bitmap: u128 = 0;
        // Reserve 63 (last valid)
        set_using_as_collateral(&mut bitmap, 63, true);
        assert!(is_using_as_collateral(bitmap, 63));

        // Reserve 64 (invalid, should be no-op)
        set_using_as_collateral(&mut bitmap, 64, true);
        assert!(!is_using_as_collateral(bitmap, 64));
    }

    #[test]
    fn test_independence() {
        // Ensure setting one reserve doesn't affect others
        let mut bitmap: u128 = 0;
        for i in 0..10u8 {
            set_using_as_collateral(&mut bitmap, i, true);
            set_borrowing(&mut bitmap, i, true);
        }
        for i in 0..10u8 {
            assert!(is_using_as_collateral(bitmap, i));
            assert!(is_borrowing(bitmap, i));
        }
        for i in 10..MAX_RESERVES {
            assert!(!is_using_as_collateral(bitmap, i));
            assert!(!is_borrowing(bitmap, i));
        }
    }
}
