/**
 * Compact PDF Export Utilities for Phone Comparison
 */

import { Phone } from "../api/phones";

/**
 * Generate PDF content for phone comparison - Compact Version
 */
export function generateComparisonPDF(
  phones: Phone[],
  verdict?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        throw new Error(
          "Unable to open print window. Please check your popup blocker settings."
        );
      }

      const htmlContent = generateCompactPrintableHTML(phones, verdict);

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          resolve();
        }, 500);
      };
    } catch (error) {
      console.error("Error generating PDF:", error);
      reject(error);
    }
  });
}

/**
 * Generate compact HTML content for printing/PDF export - Minimal Bengali-English Design
 */
function generateCompactPrintableHTML(
  phones: Phone[],
  verdict?: string
): string {
  // Generate compact comparison table
  const comparisonTable = generateCompactComparisonTable(phones);

  // Format AI verdict
  const verdictSection = verdict
    ? `
    <div class="verdict-section">
      <h3 style="font-family: 'Hind Siliguri', sans-serif;">✨ AI Verdict</h3>
      <div class="verdict-content" style="font-family: 'Hind Siliguri', sans-serif;">
        ${formatVerdictForPDF(verdict)}
      </div>
    </div>
  `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Phone Comparison - Peyechi</title>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.3;
          color: #333;
          font-size: 10px;
        }
        
        .report-container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 10mm;
        }
        
        /* Header - Minimal */
        .report-header {
          text-align: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #333;
        }
        
        .report-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
          color: #333;
        }
        
        .report-subtitle {
          font-size: 10px;
          color: #666;
          font-family: 'Hind Siliguri', sans-serif;
        }
        
        /* Phone Overview - Minimal */
        .phones-overview {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .phone-card {
          background: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          text-align: center;
          min-width: 110px;
          flex: 1;
          max-width: 150px;
        }
        
        .phone-image {
          width: 45px;
          height: 55px;
          object-fit: contain;
          margin-bottom: 4px;
          background: #fff;
        }
        
        .phone-name {
          font-size: 10px;
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
          line-height: 1.2;
        }
        
        .phone-price {
          font-size: 11px;
          font-weight: 700;
          color: #000;
          margin-bottom: 4px;
        }
        
        .phone-specs {
          font-size: 8px;
          color: #666;
          text-align: left;
        }
        
        .spec-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1px;
        }
        
        /* Compact Comparison Table */
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 9px;
        }
        
        .comparison-table th {
          background: #e8e8e8;
          color: #333;
          padding: 4px 3px;
          text-align: left;
          font-weight: 600;
          font-size: 9px;
          border: 1px solid #ccc;
        }
        
        .comparison-table td {
          padding: 3px;
          border: 1px solid #ddd;
          vertical-align: top;
        }
        
        .comparison-table tr:nth-child(even) {
          background: #fafafa;
        }
        
        .best-value {
          background: #f0f0f0 !important;
          font-weight: 600;
          color: #000;
        }
        
        .best-value::after {
          content: '★';
          color: #333;
          font-size: 8px;
          margin-left: 2px;
        }
        
        .spec-category {
          background: #e0e0e0 !important;
          font-weight: 600;
          color: #333;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        /* AI Verdict - Minimal */
        .verdict-section {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          border-left: 3px solid #333;
          margin-bottom: 10px;
        }
        
        .verdict-section h3 {
          font-size: 12px;
          color: #333;
          margin-bottom: 6px;
          font-weight: 600;
        }
        
        .verdict-content {
          font-size: 9px;
          line-height: 1.3;
          color: #333;
        }
        
        .verdict-paragraph {
          margin-bottom: 4px;
        }
        
        .verdict-header {
          font-size: 10px;
          font-weight: 600;
          color: #000;
          margin: 5px 0 3px 0;
        }
        
        .verdict-list-item {
          margin-bottom: 2px;
          padding-left: 8px;
          position: relative;
        }
        
        .verdict-list-item::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #333;
        }
        
        /* Footer - Minimal */
        .report-footer {
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 8px;
          color: #666;
        }
        
        .footer-logo {
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
        }
        
        /* Print Styles */
        @media print {
          body { 
            margin: 0; 
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .report-container { 
            padding: 8mm; 
          }
          
          .phone-card, .verdict-section { 
            break-inside: avoid; 
          }
          
         .phone-card {
            background: #f8f8f8 !important;
            border: 1px solid #ddd !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .verdict-section {
            background: #f5f5f5 !important;
            border-left: 3px solid #333 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .comparison-table th {
            background: #e8e8e8 !important;
            color: #333 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .comparison-table tr:nth-child(even) {
            background: #fafafa !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .best-value {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .spec-category {
            background: #e0e0e0 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        
        @page {
          margin: 10mm;
          size: A4;
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <!-- Header -->
        <div class="report-header">
          <h1 class="report-title">📱 Phone Comparison</h1>
          <p class="report-subtitle">Smartphones-এর তুলনা এবং পর্যালোচনা • ${new Date().toLocaleDateString()}</p>
        </div>
        
        <!-- Phone Overview -->
        <div class="phones-overview">
          ${phones
      .map(
        (phone, index) => `
            <div class="phone-card">
              <img src="${phone.img_url || "/no-image-placeholder.svg"}" alt="${phone.name}" class="phone-image">
              <div class="phone-name">${phone.brand} ${phone.name}</div>
              <div class="phone-price">৳${phone.price}</div>
              <div class="phone-specs">
                <div class="spec-item"><span>RAM:</span><span>${phone.ram_gb ? `${phone.ram_gb}GB` : "N/A"}</span></div>
                <div class="spec-item"><span>Storage:</span><span>${phone.storage_gb ? `${phone.storage_gb}GB` : "N/A"}</span></div>
                <div class="spec-item"><span>Camera:</span><span>${phone.primary_camera_mp ? `${phone.primary_camera_mp}MP` : "N/A"}</span></div>
                <div class="spec-item"><span>Battery:</span><span>${phone.battery_capacity_numeric ? `${phone.battery_capacity_numeric}mAh` : "N/A"}</span></div>
              </div>
            </div>
          `
      )
      .join("")}
        </div>
        
        <!-- Detailed Comparison Table -->
        ${comparisonTable}
        
        <!-- AI Verdict -->
        ${verdictSection}
        
        <!-- Footer -->
        <div class="report-footer">
          <div class="footer-logo">Peyechi - peyechi.com</div>
          <p style="font-family: 'Hind Siliguri', sans-serif;">AI-generated insights • ক্রয়ের আগে Specifications যাচাই করুন</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate visual comparison chart similar to ChatPage stacked bars
 */
function generateComparisonChart(phones: Phone[]): string {
  const features = [
    {
      label: "Price Value",
      key: "price_original",
      unit: "",
      reverse: true, // Lower is better for price
      colors: ["#377D5B", "#80EF80", "#33FF99", "#2ecc71", "#4CAF50"],
    },
    {
      label: "RAM",
      key: "ram_gb",
      unit: "GB",
      colors: ["#377D5B", "#80EF80", "#33FF99", "#2ecc71", "#4CAF50"],
    },
    {
      label: "Storage",
      key: "storage_gb",
      unit: "GB",
      colors: ["#377D5B", "#80EF80", "#33FF99", "#2ecc71", "#4CAF50"],
    },
    {
      label: "Main Camera",
      key: "primary_camera_mp",
      unit: "MP",
      colors: ["#377D5B", "#80EF80", "#33FF99", "#2ecc71", "#4CAF50"],
    },
    {
      label: "Battery",
      key: "battery_capacity_numeric",
      unit: "mAh",
      colors: ["#377D5B", "#80EF80", "#33FF99", "#2ecc71", "#4CAF50"],
    },
  ];

  const chartFeatures = features
    .map((feature) => {
      const values = phones.map((phone) => (phone as any)[feature.key] || 0);
      const maxValue = Math.max(...values);

      if (maxValue === 0) return null;

      const percentages = values.map((value) => {
        if (feature.reverse) {
          // For price, lower is better, so invert the percentage
          const normalizedValue = maxValue - value + Math.min(...values);
          return (
            (normalizedValue /
              (maxValue - Math.min(...values) + Math.min(...values))) *
            100
          );
        }
        return (value / maxValue) * 100;
      });

      const bars = phones
        .map((phone, index) => {
          const percentage = percentages[index];
          const value = values[index];
          const color = feature.colors[index % feature.colors.length];

          return {
            phone: phone.name,
            percentage,
            value,
            color,
            displayValue: value ? `${value}${feature.unit}` : "N/A",
          };
        })
        .filter((bar) => bar.percentage > 0);

      return {
        label: feature.label,
        bars,
        rawValues: values
          .map(
            (val, idx) =>
              `${phones[idx].name}: ${val ? val + feature.unit : "N/A"}`
          )
          .join(" | "),
      };
    })
    .filter(Boolean);

  if (chartFeatures.length === 0) return "";

  return `
    <div class="chart-section">
      <div class="chart-title">📊 Performance Comparison</div>
      <div class="chart-container">
        ${chartFeatures
      .map(
        (feature) => `
          <div class="chart-feature">
            <div class="feature-label">${feature!.label}</div>
            <div class="feature-bars">
              ${feature!.bars
            .map(
              (bar) => `
                <div class="feature-bar" style="width: ${bar.percentage}%; background-color: ${bar.color};">
                  ${bar.percentage > 15 ? `${bar.percentage.toFixed(0)}%` : ""}
                </div>
              `
            )
            .join("")}
            </div>
            <div class="feature-values">${feature!.rawValues}</div>
          </div>
        `
      )
      .join("")}
      </div>
    </div>
  `;
}

/**
 * Generate compact comparison table
 */
function generateCompactComparisonTable(phones: Phone[]): string {
  const specs = [
    {
      category: "Basic",
      items: [
        { label: "Brand", key: "brand" },
        { label: "Price", key: "price", format: (val: any) => `৳${val}` },
      ],
    },
    {
      category: "Display",
      items: [
        {
          label: "Size",
          key: "screen_size_inches",
          format: (val: any) => (val ? `${val}"` : "N/A"),
        },
        { label: "Type", key: "display_type" },
        {
          label: "Refresh Rate",
          key: "refresh_rate_hz",
          format: (val: any) => (val ? `${val}Hz` : "N/A"),
        },
      ],
    },
    {
      category: "Performance",
      items: [
        { label: "Chipset", key: "chipset" },
        {
          label: "RAM",
          key: "ram_gb",
          format: (val: any) => (val ? `${val}GB` : "N/A"),
        },
        {
          label: "Storage",
          key: "storage_gb",
          format: (val: any) => (val ? `${val}GB` : "N/A"),
        },
      ],
    },
    {
      category: "Camera",
      items: [
        {
          label: "Main",
          key: "primary_camera_mp",
          format: (val: any) => (val ? `${val}MP` : "N/A"),
        },
        {
          label: "Front",
          key: "selfie_camera_mp",
          format: (val: any) => (val ? `${val}MP` : "N/A"),
        },
      ],
    },
    {
      category: "Battery",
      items: [
        {
          label: "Capacity",
          key: "battery_capacity_numeric",
          format: (val: any) => (val ? `${val}mAh` : "N/A"),
        },
        { label: "Fast Charging", key: "quick_charging" },
      ],
    },
  ];

  const tableHeaders = `
    <tr>
      <th style="width: 80px;">Spec</th>
      ${phones.map((phone) => `<th style="text-align: center; width: ${Math.floor(80 / phones.length)}%;">${phone.brand} ${phone.name}</th>`).join("")}
    </tr>
  `;

  const tableRows = specs
    .map((category) => {
      const categoryRow = `
      <tr>
        <td class="spec-category" colspan="${phones.length + 1}">${category.category}</td>
      </tr>
    `;

      const specRows = category.items
        .map(
          (spec) => {
            // Determine best value for highlighting
            const values = phones.map((phone) => (phone as any)[spec.key]);
            const numericValues = values.map(val => parseFloat(val) || 0);
            const bestIndex = getBestValueIndex(spec.key, numericValues);

            return `
      <tr>
        <td style="font-weight: 600; color: #495057;">${spec.label}</td>
        ${phones
                .map((phone, index) => {
                  const value = (phone as any)[spec.key];
                  const formattedValue = spec.format
                    ? spec.format(value)
                    : value || "N/A";
                  const isBest = index === bestIndex && value && value !== "N/A";
                  return `<td style="text-align: center;" ${isBest ? 'class="best-value"' : ''}>${formattedValue}</td>`;
                })
                .join("")}
      </tr>
    `;
          }
        )
        .join("");

      return categoryRow + specRows;
    })
    .join("");

  return `
    <table class="comparison-table">
      <thead>${tableHeaders}</thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

/**
 * Format AI verdict for PDF with enhanced structure
 */
function formatVerdictForPDF(verdict: string): string {
  const sections = verdict.split(/\n\s*\n/).filter((s) => s.trim());

  return sections
    .map((section) => {
      const trimmed = section.trim();

      // Check for markdown headers (## or **)
      if (/^##\s/.test(trimmed) || /^\*\*(.*?)\*\*/.test(trimmed)) {
        const headerText = trimmed.replace(/^##\s/, '').replace(/^\*\*(.*?)\*\*/, '$1');
        return `<div class="verdict-header">${headerText}</div>`;
      }

      // Check for headers
      if (/^(OVERVIEW|KEY DIFFERENCES|STRENGTHS|WEAKNESSES|FINAL RECOMMENDATION|VERDICT|RECOMMENDATION|CONCLUSION):/i.test(trimmed)) {
        return `<div class="verdict-header">${trimmed}</div>`;
      }

      // Check for numbered points
      if (/^\d+\./.test(trimmed)) {
        return `<div class="verdict-header">${trimmed}</div>`;
      }

      // Check for bullet points
      if (/^[•\-*]\s/.test(trimmed)) {
        const items = trimmed
          .split(/\n[•\-*]\s/)
          .map((item) => item.trim())
          .filter(Boolean);
        return items
          .map((item) => `<div class="verdict-list-item">${item}</div>`)
          .join("");
      }

      // Handle bold text formatting
      const formattedText = trimmed
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Regular paragraph
      return `<div class="verdict-paragraph">${formattedText}</div>`;
    })
    .join("");
}

// Re-export other utility functions
export function generateShareableUrl(
  phoneSlugs: string[],
  baseUrl: string = window.location.origin
): string {
  const path = `/compare/${phoneSlugs.join("-vs-")}`;
  return `${baseUrl}${path}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const result = document.execCommand("copy");
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

export async function shareComparison(
  phones: Phone[],
  url: string
): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    const phoneNames = phones.map((p) => `${p.brand} ${p.name}`).join(" vs ");

    await navigator.share({
      title: `Phone Comparison: ${phoneNames}`,
      text: `Check out this phone comparison on Peyechi: ${phoneNames}`,
      url: url,
    });

    return true;
  } catch (error) {
    console.error("Error sharing:", error);
    return false;
  }
}

export interface ComparisonHistoryItem {
  id: string;
  phoneSlugs: string[];
  phoneNames: string[];
  timestamp: Date;
  url: string;
}

const HISTORY_STORAGE_KEY = "peyechi_comparison_history";
const MAX_HISTORY_ITEMS = 10;

export function saveComparisonToHistory(phones: Phone[]): void {
  try {
    const historyItem: ComparisonHistoryItem = {
      id: Date.now().toString(),
      phoneSlugs: phones.map((p) => p.slug!),
      phoneNames: phones.map((p) => `${p.brand} ${p.name}`),
      timestamp: new Date(),
      url: generateShareableUrl(phones.map((p) => p.slug!)),
    };

    const existingHistory = getComparisonHistory();

    const filteredHistory = existingHistory.filter(
      (item) => !arraysEqual(item.phoneSlugs.sort(), historyItem.phoneSlugs.sort())
    );

    const newHistory = [historyItem, ...filteredHistory].slice(
      0,
      MAX_HISTORY_ITEMS
    );

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Error saving comparison to history:", error);
  }
}

export function getComparisonHistory(): ComparisonHistoryItem[] {
  try {
    const historyJson = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!historyJson) return [];

    const history = JSON.parse(historyJson);

    return history.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (error) {
    console.error("Error loading comparison history:", error);
    return [];
  }
}

export function clearComparisonHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing comparison history:", error);
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

/**
 * Determine the best value index for highlighting in comparison table
 */
function getBestValueIndex(key: string, values: number[]): number {
  if (values.every(val => val === 0)) return -1; // No valid values

  // For price-related fields, lower is better
  const lowerIsBetter = ['price', 'price_original'].some(field => key.includes(field));

  if (lowerIsBetter) {
    const nonZeroValues = values.filter(val => val > 0);
    if (nonZeroValues.length === 0) return -1;
    const minValue = Math.min(...nonZeroValues);
    return values.findIndex(val => val === minValue && val > 0);
  } else {
    // For other specs, higher is better
    const maxValue = Math.max(...values);
    return values.findIndex(val => val === maxValue);
  }
}
