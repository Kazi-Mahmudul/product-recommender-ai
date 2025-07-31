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
 * Generate compact HTML content for printing/PDF export
 */
function generateCompactPrintableHTML(
  phones: Phone[],
  verdict?: string
): string {
  // Generate visual comparison chart similar to ChatPage
  const comparisonChart = generateComparisonChart(phones);

  // Generate compact comparison table
  const comparisonTable = generateCompactComparisonTable(phones);

  // Format AI verdict
  const verdictSection = verdict
    ? `
    <div class="verdict-section">
      <h3>🤖 AI Analysis</h3>
      <div class="verdict-content">
        ${formatVerdictForPDF(verdict)}
      </div>
    </div>
  `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Phone Comparison Report - Epick</title>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.4;
          color: #2c3e50;
          font-size: 12px;
        }
        
        .report-container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 12mm;
        }
        
        /* Header - Compact */
        .report-header {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #3498db;
        }
        
        .report-title {
          font-size: 20px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 5px;
        }
        
        .report-meta {
          font-size: 11px;
          color: #7f8c8d;
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
        }
        
        /* Phone Overview - Horizontal Layout */
        .phones-overview {
          display: flex;
          gap: 12px;
          margin-bottom: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .phone-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
          min-width: 120px;
          flex: 1;
          max-width: 160px;
        }
        
        .phone-image {
          width: 50px;
          height: 65px;
          object-fit: contain;
          margin-bottom: 6px;
        }
        
        .phone-name {
          font-size: 12px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 3px;
          line-height: 1.2;
        }
        
        .phone-price {
          font-size: 14px;
          font-weight: 700;
          color: #e74c3c;
          margin-bottom: 6px;
        }
        
        .phone-specs {
          font-size: 10px;
          color: #6c757d;
          text-align: left;
        }
        
        .spec-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1px;
        }
        
        /* Visual Comparison Chart */
        .chart-section {
          margin-bottom: 15px;
        }
        
        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 8px;
          text-align: center;
        }
        
        .chart-container {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 12px;
        }
        
        .chart-feature {
          margin-bottom: 10px;
        }
        
        .feature-label {
          font-size: 11px;
          font-weight: 600;
          color: #495057;
          margin-bottom: 3px;
        }
        
        .feature-bars {
          display: flex;
          height: 18px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
        }
        
        .feature-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 600;
          color: white;
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
        }
        
        .feature-values {
          display: flex;
          justify-content: space-between;
          margin-top: 2px;
          font-size: 9px;
          color: #6c757d;
        }
        
        /* Compact Comparison Table */
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 10px;
        }
        
        .comparison-table th {
          background: #3498db;
          color: white;
          padding: 6px 4px;
          text-align: left;
          font-weight: 600;
          font-size: 10px;
        }
        
        .comparison-table td {
          padding: 4px;
          border-bottom: 1px solid #e9ecef;
          vertical-align: top;
        }
        
        .comparison-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .spec-category {
          background: #e9ecef !important;
          font-weight: 600;
          color: #495057;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* AI Verdict - Compact */
        .verdict-section {
          background: #f0f8ff;
          padding: 12px;
          border-radius: 6px;
          border-left: 3px solid #3498db;
          margin-bottom: 12px;
        }
        
        .verdict-section h3 {
          font-size: 14px;
          color: #2980b9;
          margin-bottom: 8px;
        }
        
        .verdict-content {
          font-size: 11px;
          line-height: 1.4;
        }
        
        .verdict-paragraph {
          margin-bottom: 6px;
          color: #2c3e50;
        }
        
        .verdict-header {
          font-size: 12px;
          font-weight: 600;
          color: #2980b9;
          margin: 8px 0 4px 0;
        }
        
        .verdict-list-item {
          margin-bottom: 3px;
          padding-left: 10px;
          position: relative;
        }
        
        .verdict-list-item::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #3498db;
        }
        
        /* Footer - Compact */
        .report-footer {
          margin-top: 15px;
          padding-top: 8px;
          border-top: 1px solid #e9ecef;
          text-align: center;
          font-size: 9px;
          color: #6c757d;
        }
        
        .footer-logo {
          font-weight: 600;
          color: #3498db;
          margin-bottom: 3px;
        }
        
        /* Print Styles */
        @media print {
          body { margin: 0; }
          .report-container { padding: 8mm; }
          .phone-card, .verdict-section { break-inside: avoid; }
        }
        
        @page {
          margin: 8mm;
          size: A4;
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <!-- Header -->
        <div class="report-header">
          <h1 class="report-title">📱 Phone Comparison Report</h1>
          <div class="report-meta">
            <span><strong>Epick AI</strong> - Smart Phone Decisions</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        <!-- Phone Overview -->
        <div class="phones-overview">
          ${phones
            .map(
              (phone, index) => `
            <div class="phone-card">
              <img src="${phone.img_url || "https://via.placeholder.com/50x65?text=No+Image"}" alt="${phone.name}" class="phone-image">
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
        
        <!-- Visual Comparison Chart -->
        ${comparisonChart}
        
        <!-- Detailed Comparison Table -->
        ${comparisonTable}
        
        <!-- AI Verdict -->
        ${verdictSection}
        
        <!-- Footer -->
        <div class="report-footer">
          <div class="footer-logo">🎯 Epick - epick.com.bd</div>
          <p>AI-generated insights. Verify specifications before purchase.</p>
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
      colors: ["#3498db", "#9b59b6", "#e74c3c", "#f39c12", "#2ecc71"],
    },
    {
      label: "RAM",
      key: "ram_gb",
      unit: "GB",
      colors: ["#3498db", "#9b59b6", "#e74c3c", "#f39c12", "#2ecc71"],
    },
    {
      label: "Storage",
      key: "storage_gb",
      unit: "GB",
      colors: ["#3498db", "#9b59b6", "#e74c3c", "#f39c12", "#2ecc71"],
    },
    {
      label: "Main Camera",
      key: "primary_camera_mp",
      unit: "MP",
      colors: ["#3498db", "#9b59b6", "#e74c3c", "#f39c12", "#2ecc71"],
    },
    {
      label: "Battery",
      key: "battery_capacity_numeric",
      unit: "mAh",
      colors: ["#3498db", "#9b59b6", "#e74c3c", "#f39c12", "#2ecc71"],
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
          (spec) => `
      <tr>
        <td style="font-weight: 600; color: #495057;">${spec.label}</td>
        ${phones
          .map((phone) => {
            const value = (phone as any)[spec.key];
            const formattedValue = spec.format
              ? spec.format(value)
              : value || "N/A";
            return `<td style="text-align: center;">${formattedValue}</td>`;
          })
          .join("")}
      </tr>
    `
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
 * Format AI verdict for PDF with compact structure
 */
function formatVerdictForPDF(verdict: string): string {
  const sections = verdict.split(/\n\s*\n/).filter((s) => s.trim());

  return sections
    .map((section) => {
      const trimmed = section.trim();

      // Check for headers
      if (/^(VERDICT|RECOMMENDATION|CONCLUSION):/i.test(trimmed)) {
        return `<div class="verdict-header">${trimmed}</div>`;
      }

      // Check for numbered points
      if (/^\d+\./.test(trimmed)) {
        return `<div class="verdict-header">${trimmed}</div>`;
      }

      // Check for bullet points
      if (/^[•\-\*]\s/.test(trimmed)) {
        const items = trimmed
          .split(/\n[•\-*]\s/)
          .map((item) => item.trim())
          .filter(Boolean);
        return items
          .map((item) => `<div class="verdict-list-item">${item}</div>`)
          .join("");
      }

      // Regular paragraph
      return `<div class="verdict-paragraph">${trimmed}</div>`;
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
      text: `Check out this phone comparison on Epick: ${phoneNames}`,
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

const HISTORY_STORAGE_KEY = "epick_comparison_history";
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
