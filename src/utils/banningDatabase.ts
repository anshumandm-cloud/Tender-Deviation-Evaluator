import { BlacklistedEntity } from "../types/serviceEvaluation";

/**
 * Standard Simulated Database of Debarred / Banned / Blacklisted Entities
 * across Central Public Procurement Portal (CPPP), Government e-Marketplace (GeM Incident Management),
 * Central Vigilance Commission (CVC), and Internal Corporate Vigilance circulars.
 */
export const DEFAULT_BLACKLISTED_ENTITIES: BlacklistedEntity[] = [
  {
    id: "ban-001",
    entityName: "Bidder 3",
    sourcePortal: "GeM Incident Management",
    referenceOrderNo: "GeM/INC/2025/DEBAR-4819",
    orderDate: "14-08-2025",
    banPeriodYears: 2,
    reasonForBanning: "Unilateral abandonment of HVAC & electromechanical facility maintenance contract post-award without statutory intimation.",
    portalUrl: "https://gem.gov.in/incident-management",
  },
  {
    id: "ban-002",
    entityName: "Apex Facility Solutions Pvt Ltd",
    sourcePortal: "CPPP Central Debarment",
    referenceOrderNo: "CPPP/DEBAR/MIN-PWR/2024/09",
    orderDate: "02-11-2024",
    banPeriodYears: 3,
    reasonForBanning: "Submission of forged client performance certificate and non-payment of EPF/ESI statutory contributions.",
    portalUrl: "https://eprocure.gov.in/cppp/debarmentlist",
  },
  {
    id: "ban-003",
    entityName: "Zenith Electro Services Corp",
    sourcePortal: "CVC Banned Register",
    referenceOrderNo: "CVC/VIG/BAN/2023/112",
    orderDate: "19-01-2024",
    banPeriodYears: 2,
    reasonForBanning: "Collusive bidding in substation operation tender and fraudulent UDIN endorsement on balance sheets.",
    portalUrl: "https://cvc.gov.in/public-registers",
  },
  {
    id: "ban-004",
    entityName: "Falcon Infra & Maintenance LLP",
    sourcePortal: "Internal Blacklist",
    referenceOrderNo: "CORP/VIG/ORDER/2025/33",
    orderDate: "12-05-2025",
    banPeriodYears: 1,
    reasonForBanning: "Willful breach of integrity pact and non-deployment of qualified technical supervisors.",
    portalUrl: "https://internal-vigilance.org.in/blacklisted-firms",
  },
  {
    id: "ban-005",
    entityName: "Global Powertech Engineers",
    sourcePortal: "Custom URL / Portal",
    referenceOrderNo: "MHI/HE/DEBAR/2024/76",
    orderDate: "28-09-2024",
    banPeriodYears: 3,
    reasonForBanning: "Quality failure in critical transformer rewinding and blacklisted across central PSUs under Ministry of Heavy Industries.",
    portalUrl: "https://heavyindustries.gov.in/debarred-agencies",
  },
];

/**
 * Checks a bidder against the blacklisted database or custom user-provided URL / lists
 */
export function checkBidderBanningStatus(
  bidderName: string,
  blacklist: BlacklistedEntity[]
): {
  isAlertTriggered: boolean;
  matchedEntity?: BlacklistedEntity;
  matchConfidence: number; // 0 to 100
  notes: string;
} {
  if (!bidderName || bidderName.trim().length === 0) {
    return {
      isAlertTriggered: false,
      matchConfidence: 0,
      notes: "No bidder name provided for screening.",
    };
  }

  const cleanName = bidderName.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const item of blacklist) {
    const cleanItemName = item.entityName.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Exact or direct inclusion check
    if (cleanName === cleanItemName) {
      return {
        isAlertTriggered: true,
        matchedEntity: item,
        matchConfidence: 100,
        notes: `Exact entity name match detected on ${item.sourcePortal} (Ref: ${item.referenceOrderNo}).`,
      };
    }

    // Substring or high similarity check
    if (
      (cleanName.length > 5 && cleanItemName.includes(cleanName)) ||
      (cleanItemName.length > 5 && cleanName.includes(cleanItemName))
    ) {
      return {
        isAlertTriggered: true,
        matchedEntity: item,
        matchConfidence: 85,
        notes: `Close name match identified with debarred firm '${item.entityName}' on ${item.sourcePortal}. Detailed verification required.`,
      };
    }
  }

  return {
    isAlertTriggered: false,
    matchConfidence: 0,
    notes: "No matching debarment or banning records found across checked databases.",
  };
}
