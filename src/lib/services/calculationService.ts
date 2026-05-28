import { Decimal } from 'decimal.js';

export type InputUnit = 'ft' | 'in' | 'mm';

export interface TimberInput {
  length: number;
  width: number;
  thickness: number;
  quantity: number;
  unitL: InputUnit;
  unitW: InputUnit;
  unitT: InputUnit;
}

// Ensure 4 decimal precision natively
Decimal.set({ precision: 10, rounding: 4 });

const INCH_IN_FT = new Decimal(12);
const MM_IN_INCH = new Decimal(25.4);
const CFT_DIVISOR = new Decimal(144);

export class CalculationService {
  /**
   * Converts varied unit inputs safely to standard Inches for calculation
   * length -> returns value in FEET 
   * width, thickness -> returns value in INCHES
   */
  static safelyConvertToStandard(val: number, fromUnit: InputUnit, toStandard: 'ft' | 'in'): Decimal {
    let raw = new Decimal(val);
    
    // First normalize to inches
    let inInches: Decimal;
    if (fromUnit === 'ft') {
      inInches = raw.mul(INCH_IN_FT);
    } else if (fromUnit === 'mm') {
      inInches = raw.div(MM_IN_INCH);
    } else {
      inInches = raw;
    }

    // Return requested standard
    if (toStandard === 'ft') {
      return inInches.div(INCH_IN_FT);
    }
    return inInches;
  }

  /**
   * Calculates Total Volume in CFT and returns purely logic-based Decimals
   */
  static calculateCFT(input: TimberInput): { volumePerItem: Decimal, totalVolume: Decimal } {
    // Standard Formula: L(ft) * W(in) * T(in) / 144
    const lFt = this.safelyConvertToStandard(input.length, input.unitL, 'ft');
    const wIn = this.safelyConvertToStandard(input.width, input.unitW, 'in');
    const tIn = this.safelyConvertToStandard(input.thickness, input.unitT, 'in');
    const qty = new Decimal(input.quantity);

    const volumePerItem = lFt.mul(wIn).mul(tIn).div(CFT_DIVISOR);
    const totalVolume = volumePerItem.mul(qty);

    return { volumePerItem, totalVolume };
  }

  /**
   * Converts DB Price (paise) to display Price (rupees) safely
   */
  static toRupees(paise: number): Decimal {
    return new Decimal(paise).div(100);
  }

  /**
   * Calculates total exact price in Paise (for saving in DB) given Volume and PricePerCft (already in paise)
   */
  static calculateTotalPaise(volumeCFT: Decimal, pricePerCftPaise: number): number {
    return volumeCFT.mul(new Decimal(pricePerCftPaise)).round().toNumber();
  }

  /**
   * Calculates GST split as per Indian Tax rules (Section 9.1 of PRD)
   */
  static calculateGST(itemTotalPaise: number, customerState: string, orgState: string, hsnGstRate: number = 18): {
    cgst: number;
    sgst: number;
    igst: number;
    totalGst: number;
  } {
    const isInterState = customerState.toUpperCase() !== orgState.toUpperCase();
    const totalGstAmount = Math.round(itemTotalPaise * (hsnGstRate / 100));

    if (isInterState) {
      return {
        cgst: 0,
        sgst: 0,
        igst: totalGstAmount,
        totalGst: totalGstAmount
      };
    } else {
      // For intra-state, split GST into CGST and SGST
      const splitVal = Math.floor(totalGstAmount / 2);
      return {
        cgst: splitVal,
        sgst: totalGstAmount - splitVal, // Subtracting from total handles odd paise amounts correctly
        igst: 0,
        totalGst: totalGstAmount
      };
    }
  }
}
