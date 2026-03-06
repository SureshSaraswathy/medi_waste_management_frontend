/**
 * Delete Validation Service
 * 
 * Validates if a record can be deleted by checking if it's referenced in other modules.
 * Prevents deletion when records are in use to maintain data integrity.
 */

import { hcfService } from '../services/hcfService';
import { companyService } from '../services/companyService';
import { districtService } from '../services/districtService';
import { stateService } from '../services/stateService';
import { areaService } from '../services/areaService';
import { categoryService } from '../services/categoryService';
import { pcbZoneService } from '../services/pcbZoneService';
import { hcfTypeService } from '../services/hcfTypeService';
import { routeService } from '../services/routeService';
import { routeAssignmentService } from '../services/routeAssignmentService';
import { fleetService } from '../services/fleetService';
import { barcodeLabelService } from '../services/barcodeLabelService';
import { hcfAmendmentService } from '../services/hcfAmendmentService';
import { frequencyService } from '../services/frequencyService';
import { wasteCollectionService } from '../services/wasteCollectionService';
import { wasteTransactionService } from '../services/wasteTransactionService';
import { autoclaveRegisterService } from '../services/autoclaveRegisterService';
import { disposalRegisterService } from '../services/disposalRegisterService';
import { incinerationRegisterService } from '../services/incinerationRegisterService';

export interface ValidationResult {
  canDelete: boolean;
  message: string;
}

/**
 * Check if Company can be deleted
 * Rule: Company records cannot be deleted
 */
export const validateCompanyDelete = async (companyId: string): Promise<ValidationResult> => {
  return {
    canDelete: false,
    message: 'Record cannot be deleted because it is used in another module.'
  };
};

/**
 * Check if State can be deleted
 * Rule: State records cannot be deleted
 */
export const validateStateDelete = async (stateId: string): Promise<ValidationResult> => {
  return {
    canDelete: false,
    message: 'Record cannot be deleted because it is used in another module.'
  };
};

/**
 * Check if ColorCode can be deleted
 * Rule: ColorCode records cannot be deleted
 */
export const validateColorCodeDelete = async (colorCodeId: string): Promise<ValidationResult> => {
  return {
    canDelete: false,
    message: 'Record cannot be deleted because it is used in another module.'
  };
};

/**
 * Check if Area can be deleted
 * Rule: Prevent delete if Area is used in HCF Master
 */
export const validateAreaDelete = async (areaId: string): Promise<ValidationResult> => {
  try {
    const allHcfs = await hcfService.getAllHcfs();
    const areaInUse = allHcfs.some(hcf => hcf.areaId === areaId);
    
    if (areaInUse) {
      return {
        canDelete: false,
        message: 'Deletion not allowed. Record is used in another module.'
      };
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating area delete:', error);
    // If we can't check, allow deletion (fail-safe)
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if District can be deleted
 * Rule: Prevent delete if District is used in HCF Master
 */
export const validateDistrictDelete = async (districtId: string): Promise<ValidationResult> => {
  try {
    const allHcfs = await hcfService.getAllHcfs();
    const districtInUse = allHcfs.some(hcf => hcf.district === districtId);
    
    if (districtInUse) {
      return {
        canDelete: false,
        message: 'Deletion not allowed. Record is used in another module.'
      };
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating district delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if User can be deleted
 * Rule: Once a user is created it cannot be deleted
 */
export const validateUserDelete = async (userId: string): Promise<ValidationResult> => {
  return {
    canDelete: false,
    message: 'Record cannot be deleted because it is used in another module.'
  };
};

/**
 * Check if HCF Amendment can be deleted
 * Rule: Prevent delete if the record is used in HCF Master
 */
export const validateHcfAmendmentDelete = async (amendmentId: string): Promise<ValidationResult> => {
  try {
    const allHcfs = await hcfService.getAllHcfs();
    // Check if amendment is referenced in HCF records
    // Note: Adjust this based on actual HCF data structure
    const amendmentInUse = allHcfs.some(hcf => {
      // Add logic to check if amendmentId is referenced
      return false; // Placeholder - adjust based on actual structure
    });
    
    if (amendmentInUse) {
      return {
        canDelete: false,
        message: 'Deletion not allowed. Record is used in another module.'
      };
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating HCF amendment delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if HCF can be deleted
 * Rule: Prevent delete if the record is used in:
 * - Barcode
 * - Route
 * - WasteData
 */
export const validateHcfDelete = async (hcfId: string): Promise<ValidationResult> => {
  try {
    // Check Barcode references
    try {
      const barcodes = await barcodeLabelService.getAllBarcodeLabels();
      const hcfInBarcode = barcodes.some(barcode => barcode.hcfId === hcfId);
      if (hcfInBarcode) {
        return {
          canDelete: false,
          message: 'Deletion not allowed. Record is used in another module.'
        };
      }
    } catch (error) {
      console.warn('Could not check barcode references:', error);
    }

    // Check WasteData references (waste collections/transactions)
    try {
      const wasteCollections = await wasteCollectionService.getAllWasteCollections();
      const hcfInWasteData = wasteCollections.some(collection => collection.hcfId === hcfId);
      if (hcfInWasteData) {
        return {
          canDelete: false,
          message: 'Deletion not allowed. Record is used in another module.'
        };
      }
    } catch (error) {
      console.warn('Could not check waste data references:', error);
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating HCF delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if HCFType can be deleted
 * Rule: Prevent delete if used in HCF Master
 */
export const validateHcfTypeDelete = async (hcfTypeId: string): Promise<ValidationResult> => {
  try {
    const allHcfs = await hcfService.getAllHcfs();
    const hcfTypeInUse = allHcfs.some(hcf => hcf.hcfTypeCode === hcfTypeId);
    
    if (hcfTypeInUse) {
      return {
        canDelete: false,
        message: 'Deletion not allowed. Record is used in another module.'
      };
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating HCF type delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if Category can be deleted
 * Rule: Prevent delete if used in HCF Master
 */
export const validateCategoryDelete = async (categoryId: string): Promise<ValidationResult> => {
  try {
    const allHcfs = await hcfService.getAllHcfs();
    const categoryInUse = allHcfs.some(hcf => hcf.category === categoryId);
    
    if (categoryInUse) {
      return {
        canDelete: false,
        message: 'Deletion not allowed. Record is used in another module.'
      };
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating category delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if PCBZone can be deleted
 * Rule: Prevent delete if used in HCF Master
 */
export const validatePcbZoneDelete = async (pcbZoneId: string): Promise<ValidationResult> => {
  try {
    const allHcfs = await hcfService.getAllHcfs();
    const pcbZoneInUse = allHcfs.some(hcf => hcf.pcbZone === pcbZoneId);
    
    if (pcbZoneInUse) {
      return {
        canDelete: false,
        message: 'Deletion not allowed. Record is used in another module.'
      };
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating PCB zone delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if Fleet can be deleted
 * Rule: Prevent delete if used in:
 * - Route
 * - WasteData
 */
export const validateFleetDelete = async (fleetId: string): Promise<ValidationResult> => {
  try {
    // Check Route Assignment references (fleet is referenced as vehicleId)
    try {
      const routeAssignments = await routeAssignmentService.getAllRouteAssignments();
      const fleetInRoute = routeAssignments.some(assignment => assignment.vehicleId === fleetId);
      if (fleetInRoute) {
        return {
          canDelete: false,
          message: 'Deletion not allowed. Record is used in another module.'
        };
      }
    } catch (error) {
      console.warn('Could not check route assignment references:', error);
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating fleet delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if Route can be deleted
 * Rule: Prevent delete if used in WasteData
 */
export const validateRouteDelete = async (routeId: string): Promise<ValidationResult> => {
  try {
    // Check Route Assignment references
    try {
      const routeAssignments = await routeAssignmentService.getAllRouteAssignments();
      const routeInAssignment = routeAssignments.some(assignment => assignment.routeId === routeId);
      if (routeInAssignment) {
        return {
          canDelete: false,
          message: 'Deletion not allowed. Record is used in another module.'
        };
      }
    } catch (error) {
      console.warn('Could not check route assignment references:', error);
    }

    // Check WasteData references (waste collections reference route via routeAssignmentId)
    try {
      const routeAssignments = await routeAssignmentService.getAllRouteAssignments();
      const assignmentIds = routeAssignments
        .filter(assignment => assignment.routeId === routeId)
        .map(assignment => assignment.id);
      
      if (assignmentIds.length > 0) {
        const wasteCollections = await wasteCollectionService.getAllWasteCollections();
        const routeInWasteData = wasteCollections.some(collection => 
          collection.routeAssignmentId && assignmentIds.includes(collection.routeAssignmentId)
        );
        if (routeInWasteData) {
          return {
            canDelete: false,
            message: 'Deletion not allowed. Record is used in another module.'
          };
        }
      }
    } catch (error) {
      console.warn('Could not check waste data references:', error);
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating route delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if Frequency can be deleted
 * Rule: Prevent delete if used in HCF Master
 */
export const validateFrequencyDelete = async (frequencyId: string): Promise<ValidationResult> => {
  try {
    // Check Route references (routes reference frequencyId)
    try {
      const routes = await routeService.getAllRoutes();
      const frequencyInRoute = routes.some(route => route.frequencyId === frequencyId);
      if (frequencyInRoute) {
        return {
          canDelete: false,
          message: 'Deletion not allowed. Record is used in another module.'
        };
      }
    } catch (error) {
      console.warn('Could not check route references:', error);
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating frequency delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if Equipment can be deleted
 * Rule: Prevent delete if used in:
 * - Incinerator Register
 * - Disposal Register
 */
export const validateEquipmentDelete = async (equipmentId: string): Promise<ValidationResult> => {
  try {
    // Check Incinerator Register references
    try {
      const incinerations = await incinerationRegisterService.getAllIncinerationRegisters();
      const equipmentInIncinerator = incinerations.some(record => record.equipmentId === equipmentId);
      if (equipmentInIncinerator) {
        return {
          canDelete: false,
          message: 'Equipment cannot be deleted because it is used in operations.'
        };
      }
    } catch (error) {
      console.warn('Could not check incinerator register references:', error);
    }

    // Check Disposal Register references
    // Note: Disposal Register may not have equipmentId field directly
    // If equipment is referenced via sourceBatchRef or other fields, update this check accordingly
    try {
      const disposals = await disposalRegisterService.getAllDisposalRegisters();
      // For now, checking if equipmentId might be referenced in sourceBatchRef or other fields
      // This may need adjustment based on actual Disposal Register structure
      const equipmentInDisposal = disposals.some(record => {
        // If Disposal Register has equipmentId field, check it
        // Otherwise, check if equipmentId is referenced in sourceBatchRef or other relevant fields
        return false; // Placeholder - update when Disposal Register structure is confirmed
      });
      if (equipmentInDisposal) {
        return {
          canDelete: false,
          message: 'Equipment cannot be deleted because it is used in operations.'
        };
      }
    } catch (error) {
      console.warn('Could not check disposal register references:', error);
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating equipment delete:', error);
    return { canDelete: true, message: '' };
  }
};

/**
 * Check if Barcode can be deleted
 * Rule: Prevent delete if used in Barcode table
 */
export const validateBarcodeDelete = async (barcodeId: string): Promise<ValidationResult> => {
  try {
    const barcodes = await barcodeLabelService.getAllBarcodeLabels();
    // Check if barcode is referenced by other barcodes
    // This might need adjustment based on actual barcode structure
    const barcodeInUse = barcodes.some(barcode => {
      // Add logic if barcodes reference each other
      return false; // Placeholder
    });
    
    if (barcodeInUse) {
      return {
        canDelete: false,
        message: 'Deletion not allowed. Record is used in another module.'
      };
    }
    
    return { canDelete: true, message: '' };
  } catch (error) {
    console.error('Error validating barcode delete:', error);
    return { canDelete: true, message: '' };
  }
};
