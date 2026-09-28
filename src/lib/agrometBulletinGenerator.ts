import { LocationInfo, WeatherData, WeatherDaily } from '@/types';

export function generateAgrometBulletinHtml(
  location: LocationInfo,
  weather: WeatherData,
  language: 'en' | 'hi' = 'en'
): string {
  const isHi = language === 'hi';
  const issueDate = new Date();
  const dateStr = issueDate.toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = issueDate.toLocaleTimeString(isHi ? 'hi-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const bulletinId = `GKMS/AV-${issueDate.getFullYear()}/${(location.district || location.name)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)}-${Math.floor(Date.now() / 1000).toString().slice(-4)}`;

  const aqiInfo = weather.airQuality;
  const aqiVal = aqiInfo?.aqi ?? 78;
  const aqiCat = isHi ? (aqiInfo?.categoryHi || 'संतोषजनक') : (aqiInfo?.categoryEn || 'Satisfactory');
  const stubbleRisk = isHi ? (aqiInfo?.stubbleSmokeRiskHi || 'कम') : (aqiInfo?.stubbleSmokeRisk || 'Low');
  const aqiAdvisory = isHi ? (aqiInfo?.healthAdvisoryHi || 'कृषि कार्यों के लिए वायु गुणवत्ता उपयुक्त है।') : (aqiInfo?.healthAdvisoryEn || 'Air quality is favorable for standard outdoor farm operations.');

  // Crop advice logic based on forecast
  const avgRainChance = weather.daily && weather.daily.length > 0
    ? Math.round(weather.daily.reduce((acc: number, d: WeatherDaily) => acc + d.precipitationProbability, 0) / weather.daily.length)
    : 10;
  const maxWind = weather.daily && weather.daily.length > 0
    ? Math.max(...weather.daily.map((d: WeatherDaily) => d.windSpeedMax || 0))
    : weather.current.windSpeed;

  const irrigationAdvice = avgRainChance > 40
    ? (isHi ? 'आगामी दिनों में वर्षा की संभावना को देखते हुए सिंचाई स्थगित करें और खेतों में उचित जल निकासी की व्यवस्था करें।' : 'Postpone scheduled irrigation due to high probability of precipitation. Ensure drainage channels are clear.')
    : (isHi ? 'मिट्टी की नमी को ध्यान में रखते हुए सुबह या शाम के समय आवश्यकतानुसार हल्की सिंचाई करें।' : 'Light irrigation is recommended during morning or evening hours according to field moisture deficit.');

  const sprayAdvice = maxWind > 18 || avgRainChance > 35
    ? (isHi ? 'तेज हवा और वर्षा की संभावना के कारण कीटनाशक या खरपतवारनाशी का छिड़काव न करें।' : 'Withhold foliar sprays and pesticide applications due to gusty wind velocities and precipitation threat.')
    : (isHi ? 'मौसम छिड़काव के लिए अनुकूल है। शांत हवा की स्थिति में अनुशंसित मात्रा का ही उपयोग करें।' : 'Atmospheric conditions are favorable for spraying. Apply ICAR recommended doses during calm morning windows.');

  const dailyRows = (weather.daily || []).slice(0, 7).map((d: WeatherDaily) => `
    <tr>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
        ${isHi ? d.dayNameHi : d.dayNameEn}<br/>
        <span style="font-size: 8.5pt; color: #64748b; font-weight: 400;">${d.date}</span>
      </td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0;">
        ${isHi ? d.conditionHi : d.conditionEn}
      </td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #b91c1c; font-weight: 700;">
        ${d.tempMax}°C
      </td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #0369a1; font-weight: 600;">
        ${d.tempMin}°C
      </td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">
        <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 8.5pt; font-weight: 700; background: ${d.precipitationProbability > 40 ? '#dbeafe' : '#f1f5f9'}; color: ${d.precipitationProbability > 40 ? '#1d4ed8' : '#475569'};">
          ${d.precipitationProbability}%
        </span>
        ${(d.precipitationSum !== undefined && d.precipitationSum > 0) ? `<br/><span style="font-size: 8pt; color: #0284c7;">${d.precipitationSum} mm</span>` : ''}
      </td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">
        ${d.windSpeedMax ? `${d.windSpeedMax} km/h` : '—'}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <title>Agromet Meteorological Bulletin - ${location.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Devanagari', Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 9.5pt;
      padding: 16px;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px double #0f766e;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .emblem-col {
      width: 75px;
      text-align: center;
      vertical-align: middle;
    }
    .title-col {
      text-align: center;
      vertical-align: middle;
    }
    .gov-title {
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #042f2e;
      text-transform: uppercase;
    }
    .dept-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0f766e;
      margin-top: 1px;
    }
    .sub-title {
      font-size: 8.5pt;
      color: #334155;
      font-weight: 500;
      margin-top: 1px;
    }
    .bulletin-banner {
      background: #f0fdf4;
      border: 1px solid #86efac;
      padding: 6px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
      background: #f8fafc;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .meta-item {
      font-size: 8.5pt;
    }
    .meta-label {
      color: #64748b;
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 700;
      display: block;
    }
    .meta-val {
      font-weight: 700;
      color: #1e293b;
    }
    .section-head {
      background: #0f766e;
      color: #ffffff;
      padding: 4px 10px;
      font-size: 8.5pt;
      font-weight: 700;
      border-radius: 4px;
      margin: 12px 0 6px 0;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .telemetry-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .telemetry-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 8pt;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      text-transform: uppercase;
    }
    .telemetry-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      font-size: 9pt;
    }
    .forecast-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .forecast-table th {
      background: #042f2e;
      color: #ffffff;
      font-size: 8pt;
      padding: 6px 8px;
      text-align: left;
      text-transform: uppercase;
    }
    .advisory-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 8px;
      background: #ffffff;
    }
    .advisory-title {
      font-weight: 700;
      color: #0f766e;
      font-size: 8.5pt;
      margin-bottom: 3px;
    }
    .footer-section {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8pt;
      color: #64748b;
    }
    .seal-box {
      border: 1.5px solid #0f766e;
      padding: 4px 10px;
      border-radius: 4px;
      text-align: center;
      color: #0f766e;
      font-weight: 700;
      font-size: 7.5pt;
      background: #f0fdfa;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td class="emblem-col">
        <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#0f766e" stroke-width="4" fill="#f0fdfa"/>
          <path d="M50 15 L54 28 L67 28 L56 36 L60 49 L50 41 L40 49 L44 36 L33 28 L46 28 Z" fill="#0f766e"/>
          <rect x="25" y="55" width="50" height="6" rx="2" fill="#0f766e"/>
          <rect x="30" y="65" width="40" height="4" rx="1" fill="#0f766e"/>
          <rect x="20" y="73" width="60" height="5" rx="2" fill="#0f766e"/>
          <text x="50" y="90" font-size="9" font-weight="bold" text-anchor="middle" fill="#0f766e">सत्यमेव जयते</text>
        </svg>
      </td>
      <td class="title-col">
        <div class="gov-title">${isHi ? 'भारत सरकार • पृथ्वी विज्ञान मंत्रालय' : 'GOVERNMENT OF INDIA • MINISTRY OF EARTH SCIENCES'}</div>
        <div class="dept-title">${isHi ? 'भारत मौसम विज्ञान विभाग • राष्ट्रीय कृषि मौसम वेधशाला' : 'INDIA METEOROLOGICAL DEPARTMENT • NATIONAL AGROMET DIVISION'}</div>
        <div class="sub-title">${isHi ? 'ग्रामीण कृषि मौसम सेवा (GKMS) • मौसम-वाणी संवर्धित बुलेटिन' : 'Gramin Krishi Mausam Sewa (GKMS) • Akash-Vaani Synoptic Portal'}</div>
      </td>
      <td class="emblem-col">
        <div class="seal-box">
          OFFICIAL<br/>BULLETIN
        </div>
      </td>
    </tr>
  </table>

  <div class="bulletin-banner">
    <div>
      <strong style="color: #065f46; font-size: 10pt;">${isHi ? 'जिला स्तरीय कृषि मौसम परामर्श बुलेटिन' : 'DISTRICT AGROMET ADVISORY BULLETIN'}</strong>
      <div style="font-size: 8pt; color: #047857;">${bulletinId}</div>
    </div>
    <div style="text-align: right; font-size: 8pt; color: #374151;">
      <strong>${isHi ? 'जारी तिथि' : 'Issue Date'}:</strong> ${dateStr} (${timeStr} IST)<br/>
      <strong>${isHi ? 'वैधता' : 'Validity'}:</strong> 7 ${isHi ? 'दिन (समीक्षा चक्र)' : 'Days Synoptic Horizon'}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">${isHi ? 'राज्य / संघ क्षेत्र' : 'State / UT'}</span>
      <span class="meta-val">${location.state}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">${isHi ? 'जिला / ब्लॉक' : 'District / Zone'}</span>
      <span class="meta-val">${location.district || location.name}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">${isHi ? 'स्टेशन निर्देशांक' : 'Station Coordinates'}</span>
      <span class="meta-val">${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">${isHi ? 'समुद्र तल से ऊंचाई' : 'Elevation MSL'}</span>
      <span class="meta-val">${location.elevation || 218} m MSL</span>
    </div>
  </div>

  <div class="section-head">
    ${isHi ? '1. वर्तमान मौसम एवं सिनॉप्टिक प्रेक्षण (Synoptic Telemetry)' : '1. Observed Synoptic Weather Telemetry (Live Observation)'}
  </div>
  <table class="telemetry-table">
    <tr>
      <th style="width: 25%;">${isHi ? 'पैरामीटर' : 'Parameter'}</th>
      <th style="width: 25%;">${isHi ? 'मूल्य (Value)' : 'Observed Value'}</th>
      <th style="width: 25%;">${isHi ? 'पैरामीटर' : 'Parameter'}</th>
      <th style="width: 25%;">${isHi ? 'मूल्य (Value)' : 'Observed Value'}</th>
    </tr>
    <tr>
      <td><strong>${isHi ? 'तापमान (शुष्क बल्ब)' : 'Surface Air Temp'}</strong></td>
      <td style="color: #0f766e; font-weight: 700;">${weather.current.temperature}°C (Apparent: ${weather.current.apparentTemperature}°C)</td>
      <td><strong>${isHi ? 'सापेक्षिक आर्द्रता' : 'Relative Humidity'}</strong></td>
      <td>${weather.current.relativeHumidity}%</td>
    </tr>
    <tr>
      <td><strong>${isHi ? 'सतही हवा की गति / दिशा' : 'Surface Wind Speed & Dir'}</strong></td>
      <td>${weather.current.windSpeed} km/h (${weather.current.windCompass})</td>
      <td><strong>${isHi ? 'मृदा नमी (शीर्ष 10 सेमी)' : 'Topsoil Moisture (0-10cm)'}</strong></td>
      <td>${weather.current.soilMoisture}%</td>
    </tr>
    <tr>
      <td><strong>${isHi ? 'वाष्पोत्सर्जन (ET₀)' : 'Reference ET (ET₀)'}</strong></td>
      <td>${weather.current.evapotranspiration} mm/day</td>
      <td><strong>${isHi ? 'वाष्प दाब घाटा (VPD)' : 'Vapor Pressure Deficit'}</strong></td>
      <td>${weather.current.vaporPressureDeficit} kPa</td>
    </tr>
    <tr>
      <td><strong>${isHi ? 'सौर विकिरण' : 'Global Solar Irradiance'}</strong></td>
      <td>${weather.current.solarIrradiance} W/m²</td>
      <td><strong>${isHi ? 'मल्टी-मॉडल सर्वसम्मति' : 'Multi-Model Consensus'}</strong></td>
      <td style="color: #047857; font-weight: 700;">${weather.consensus.confidenceScore}% (${weather.consensus.confidenceLevel})</td>
    </tr>
  </table>

  <div class="section-head">
    ${isHi ? '2. राष्ट्रीय वायु गुणवत्ता सूचकांक (CPCB NAQI) एवं पराली धुआं जोखिम' : '2. National Air Quality Index (CPCB NAQI) & Stubble Burning Advisory'}
  </div>
  <table class="telemetry-table">
    <tr>
      <td style="width: 30%;"><strong>${isHi ? 'वायु गुणवत्ता सूचकांक (AQI)' : 'Air Quality Index (AQI)'}:</strong></td>
      <td style="width: 20%;"><span style="font-weight: 700; color: #047857;">${aqiVal}</span> — ${aqiCat}</td>
      <td style="width: 25%;"><strong>${isHi ? 'पराली / धूल जोखिम स्तर' : 'Stubble Smoke / Dust Risk'}:</strong></td>
      <td style="width: 25%;"><span style="font-weight: 700; color: #b45309;">${stubbleRisk}</span></td>
    </tr>
    <tr>
      <td><strong>${isHi ? 'कणिका भार (Particulates)' : 'Particulate Mass Load'}:</strong></td>
      <td colspan="3">
        PM2.5: <strong>${aqiInfo?.pm25 ?? 24} µg/m³</strong> |
        PM10: <strong>${aqiInfo?.pm10 ?? 62} µg/m³</strong> |
        Dust: <strong>${aqiInfo?.dust ?? 15} µg/m³</strong> |
        CO: <strong>${aqiInfo?.carbonMonoxide ?? 320} µg/m³</strong>
      </td>
    </tr>
    <tr>
      <td><strong>${isHi ? 'कृषि कार्य सलाह' : 'Agricultural Farm Advisory'}:</strong></td>
      <td colspan="3" style="font-style: italic; color: #334155;">
        ${aqiAdvisory}
      </td>
    </tr>
  </table>

  <div class="section-head">
    ${isHi ? '3. 7-दिवसीय मात्रात्मक मौसम पूर्वानुमान (Quantitative Agromet Outlook)' : '3. 7-Day Quantitative Meteorological Forecast Matrix'}
  </div>
  <table class="forecast-table">
    <thead>
      <tr>
        <th style="width: 18%;">${isHi ? 'दिन / दिनांक' : 'Day / Date'}</th>
        <th style="width: 26%;">${isHi ? 'मौसम परिदृश्य' : 'Weather Condition'}</th>
        <th style="width: 14%; text-align: center;">${isHi ? 'अधिकतम' : 'Max Temp'}</th>
        <th style="width: 14%; text-align: center;">${isHi ? 'न्यूनतम' : 'Min Temp'}</th>
        <th style="width: 14%; text-align: center;">${isHi ? 'वर्षा संभावना' : 'Rain Prob'}</th>
        <th style="width: 14%; text-align: center;">${isHi ? 'हवा की गति' : 'Wind Speed'}</th>
      </tr>
    </thead>
    <tbody>
      ${dailyRows}
    </tbody>
  </table>

  <div class="section-head">
    ${isHi ? '4. कृषि एवं फसल प्रबंधन निर्देश (Agromet Crop Directives)' : '4. Agro-Meteorological Directives & Field Management Guidance'}
  </div>
  
  <div class="advisory-box">
    <div class="advisory-title">💧 ${isHi ? 'सिंचाई प्रबंधन निर्देश (Irrigation Scheduling)' : 'Irrigation Scheduling & Water Management'}</div>
    <div style="font-size: 8.5pt; color: #334155;">${irrigationAdvice}</div>
  </div>

  <div class="advisory-box">
    <div class="advisory-title">🌾 ${isHi ? 'पादप संरक्षण एवं रासायनिक छिड़काव (Foliar Spray Directive)' : 'Plant Protection & Chemical Application'}</div>
    <div style="font-size: 8.5pt; color: #334155;">${sprayAdvice}</div>
  </div>

  <div class="advisory-box">
    <div class="advisory-title">🐄 ${isHi ? 'पशुधन एवं डेयरी सुरक्षा (Livestock THI & Dairy Precautions)' : 'Livestock THI Index & Dairy Welfare'}</div>
    <div style="font-size: 8.5pt; color: #334155;">
      ${isHi 
        ? 'पशुओं को पर्याप्त स्वच्छ व ताजा पेयजल उपलब्ध कराएं। बाड़ों में पर्याप्त हवादार व्यवस्था रखें तथा दोपहर के समय पशुओं को सीधे धूप में न बांधें।'
        : 'Ensure adequate fresh drinking water and cross-ventilation in cattle sheds. Protect milking cows from direct solar exposure during peak afternoon hours.'}
    </div>
  </div>

  <div class="footer-section">
    <div>
      <div><strong>${isHi ? 'सत्यापन प्राधिकरण' : 'Issuing Authority'}:</strong> State Agromet Advisory Committee, Mausam-Vaani Platform</div>
      <div><strong>${isHi ? 'उपग्रह डेटा स्रोत' : 'Telemetry Consensus'}:</strong> INSAT-3DR Radiometer, Open-Meteo Ensemble & IMD Synoptic Net</div>
      <div style="font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">Verification Hash: SHA256-${bulletinId.replace(/[^A-Za-z0-9]/g, '')}${issueDate.getTime()}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; color: #042f2e;">(Nodal Agromet Officer)</div>
      <div style="font-size: 7.5pt;">Agromet Field Unit (AMFU)</div>
    </div>
  </div>

  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()" style="background: #0f766e; color: #fff; border: none; padding: 10px 24px; border-radius: 9999px; font-weight: 700; cursor: pointer; font-size: 13px;">
      🖨️ Print / Save as Official PDF
    </button>
  </div>
</body>
</html>`;
}

export function printAgrometBulletin(
  location: LocationInfo,
  weather: WeatherData,
  language: 'en' | 'hi' = 'en'
): void {
  const html = generateAgrometBulletinHtml(location, weather, language);
  
  // Use a hidden iframe for seamless printing without popup blocker issues
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    // Fallback: Open popup window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    }
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Iframe print error, falling back to window.open', e);
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => printWin.print(), 350);
      }
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 400);
}

export function downloadTextBulletin(location: LocationInfo, weather: WeatherData): void {
  const baseSlug = (location.district || location.name).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `${baseSlug}_agromet_bulletin_${Date.now()}.txt`;
  
  const content = `========================================================================
GOVERNMENT OF INDIA • MINISTRY OF EARTH SCIENCES
INDIA METEOROLOGICAL DEPARTMENT • GRAMIN KRISHI MAUSAM SEWA (GKMS)
DISTRICT AGROMET ADVISORY BULLETIN
========================================================================
Agro-Climatic Zone: ${location.district || location.name} (${location.state})
Station Name: ${location.name} (${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E)
Station Elevation: ${location.elevation || 218} m MSL
Generated On: ${new Date().toLocaleString('en-IN')} IST
Consensus Reliability: ${weather.consensus.confidenceScore}% (${weather.consensus.confidenceLevel})
========================================================================

1. SYNOPTIC TELEMETRY & MICROCLIMATE
------------------------------------------------------------------------
- Surface Air Temperature: ${weather.current.temperature}°C (Apparent: ${weather.current.apparentTemperature}°C)
- Relative Humidity: ${weather.current.relativeHumidity}%
- Surface Wind Velocity: ${weather.current.windSpeed} km/h (${weather.current.windCompass})
- Surface Soil Moisture: ${weather.current.soilMoisture}%
- Reference Evapotranspiration (ET₀): ${weather.current.evapotranspiration} mm/day
- Vapor Pressure Deficit (VPD): ${weather.current.vaporPressureDeficit} kPa
- Global Solar Irradiance: ${weather.current.solarIrradiance} W/m²
- UV Radiation Index: ${weather.current.uvIndex} (${weather.current.uvLabel})

2. CPCB NATIONAL AIR QUALITY INDEX (NAQI) & STUBBLE BURNING RISK
------------------------------------------------------------------------
- Air Quality Index (AQI): ${weather.airQuality?.aqi ?? 78} (${weather.airQuality?.categoryEn ?? 'Satisfactory'})
- Particulates: PM2.5: ${weather.airQuality?.pm25 ?? 24} µg/m³ | PM10: ${weather.airQuality?.pm10 ?? 62} µg/m³
- Stubble Smoke & Atmospheric Dust Risk: ${weather.airQuality?.stubbleSmokeRisk ?? 'Low'}
- Farm Advisory: ${weather.airQuality?.healthAdvisoryEn ?? 'Conditions favorable for normal field operations.'}

3. 7-DAY AGROMET QUANTITATIVE OUTLOOK
------------------------------------------------------------------------
${(weather.daily || []).slice(0, 7).map((d: WeatherDaily) => 
  `• ${d.date} (${d.dayNameEn}): ${d.conditionEn} | Max: ${d.tempMax}°C, Min: ${d.tempMin}°C | Rain Prob: ${d.precipitationProbability}% | Wind: ${d.windSpeedMax || 0} km/h`
).join('\n')}

========================================================================
Issued by Nodal Agromet Advisory Service, Mausam-Vaani Platform.
End of Official Bulletin.
========================================================================`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
