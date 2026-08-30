const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Header, Footer,
        AlignmentType, HeadingLevel, PageNumber, TableOfContents,
        Table, TableRow, TableCell, WidthType, BorderStyle,
        ShadingType, SectionType, TableLayoutType, PageBreak, TabStopType, TabStopPosition } = require("docx");

// ═══════════════════════════════════════════════════════
// PALETTE: DS-1 Deep Sea (business report)
// ═══════════════════════════════════════════════════════
const P = {
  bg: "0B1C2C", titleColor: "FFFFFF", subtitleColor: "B0B8C0",
  metaColor: "90989F", footerColor: "687078", accent: "529286",
  primary: "101820", body: "182030", secondary: "506070", surface: "F2F4F6",
  table: { headerBg: "529286", headerText: "FFFFFF", accentLine: "529286", innerLine: "BECFCC", surface: "E8ECEB" }
};
const c = (hex) => hex.replace("#", "");

// ═══════════════════════════════════════════════════════
// COVER HELPERS (from design-system.md)
// ═══════════════════════════════════════════════════════
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 10; // Latin chars ~pt*10 twips
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([...' \t', '-', '/', ':', '(', ')']);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 3) {
    lines[lines.length - 2] += " " + lines.pop();
  }
  return lines;
}

function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false, metaLineCount = 0, fixedHeight = 800, pageHeight = 16838 } = params;
  const usableHeight = pageHeight - (params.marginTop || 0) - (params.marginBottom || 0) - 1200;
  const titleHeight = titleLineCount * (titlePt * 23 + 100);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 300) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, midSpacing: 0, bottomSpacing };
}

function buildCoverR1(config) {
  const P = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 38, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "),
        size: 18, color: P.accent, font: { ascii: "Calibri" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: P.titleColor, font: { ascii: "Arial" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: P.subtitleColor, font: { ascii: "Calibri" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 22, color: P.metaColor, font: { ascii: "Calibri" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                                    " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ═══════════════════════════════════════════════════════
// BODY HELPERS
// ═══════════════════════════════════════════════════════
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, spacing: { before: 480, after: 240 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: { ascii: "Times New Roman" } })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, bold: true, size: 28, color: P.primary, font: { ascii: "Times New Roman" } })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: P.primary, font: { ascii: "Times New Roman" } })],
  });
}
function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 24, color: P.body, font: { ascii: "Times New Roman" } })],
  });
}
function bodyBold(label, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { line: 312, after: 120 },
    children: [
      new TextRun({ text: label, size: 24, color: P.body, font: { ascii: "Times New Roman" }, bold: true }),
      new TextRun({ text, size: 24, color: P.body, font: { ascii: "Times New Roman" } }),
    ],
  });
}
function bullet(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { line: 312, after: 60 },
    indent: { left: 480, hanging: 240 },
    children: [
      new TextRun({ text: "\u2022  ", size: 24, color: P.accent, font: { ascii: "Times New Roman" } }),
      new TextRun({ text, size: 24, color: P.body, font: { ascii: "Times New Roman" } }),
    ],
  });
}

// Table helper (horizontal-only style)
function makeTable(headers, rows) {
  const t = P.table;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: t.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: t.accentLine },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: t.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map(h => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: t.headerBg },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 21, color: t.headerText, font: { ascii: "Calibri" } })] })],
        })),
      }),
      ...rows.map((row, idx) => new TableRow({
        cantSplit: true,
        children: row.map(cell => new TableCell({
          shading: idx % 2 === 0 ? { type: ShadingType.CLEAR, fill: t.surface } : undefined,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ spacing: { line: 280 }, children: [new TextRun({ text: cell, size: 21, color: P.body, font: { ascii: "Calibri" } })] })],
        })),
      })),
    ],
  });
}

function tableCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 80, after: 240 },
    children: [new TextRun({ text, size: 21, color: P.secondary, font: { ascii: "Times New Roman", italics: true } })],
  });
}

// ═══════════════════════════════════════════════════════
// CONTENT SECTIONS
// ═══════════════════════════════════════════════════════

// --- EXECUTIVE SUMMARY ---
const execSummary = [
  h1("Executive Summary"),
  body("The global fitness application market was valued at approximately $12.1 billion in 2025 and is projected to reach between $33.6 billion and $45.5 billion by 2033-2035, representing a compound annual growth rate (CAGR) of 13.5% to 21.4% depending on the research firm and methodology used. Within this broader market, the segment targeting children and teenagers remains notably underserved despite the convergence of several powerful tailwinds: rising childhood obesity rates, increasing parental concern over excessive screen time, tightening privacy regulations that are raising barriers for incumbents, and a generational shift toward gamified, socially-driven digital experiences."),
  body("This report provides a comprehensive analysis of the existing application landscape across five distinct categories of youth-oriented activity products: guided exercise and workout applications, gamified fitness and active gaming platforms, social activity networks designed for younger users, family fitness and intergenerational challenge applications, and wearable-integrated hardware-software ecosystems. For each category, we examine the competitive dynamics, user engagement patterns, monetization approaches, and critical limitations that create white space for new entrants."),
  body("Our research identifies three high-conviction startup opportunities that exploit specific gaps in the current market. The most promising is a social fitness platform purpose-built for users aged 13 to 25, combining the activity-tracking mechanics of Strava with the privacy-first, age-appropriate design that platforms like Common Sense Media have been advocating for. Secondary opportunities exist in AR-powered active gaming that goes beyond the initial Pokemon Go novelty, and in family-unit fitness challenges that leverage existing wearable hardware from Garmin and Fitbit. Each opportunity is evaluated against regulatory requirements, technical feasibility, and monetization potential."),
];

// --- MARKET OVERVIEW ---
const marketOverview = [
  h1("Market Overview and Landscape"),
  h2("Global Fitness Application Market"),
  body("The fitness application market has experienced remarkable growth over the past five years, accelerating significantly during and after the COVID-19 pandemic. According to Grand View Research, the market was valued at $12.1 billion in 2025 and is projected to reach $33.6 billion by 2033. Polaris Market Research offers a slightly higher estimate of $12.91 billion for 2025 with a projected CAGR of 13.5% through 2034. More aggressive projections from IMARC Group estimate the market reaching $20.1 billion by 2034 at a CAGR of 21.38%, while DataIntelo projects $54.3 billion by 2034 at a 15.6% CAGR. The variance in these estimates reflects differences in methodology, geographic scope, and the breadth of applications included in the market definition."),
  body("Revenue in the fitness app segment reached $3.4 billion in 2025 according to Business of Apps, representing a 24.5% year-over-year increase. The average revenue per user (ARPU) stands at approximately $4.45 according to Statista, though this figure varies dramatically between subscription-based premium apps (such as Peloton at $12.99/month or Nike Training Club at $14.99/month) and ad-supported free tier applications. Exercise and weight loss applications dominate the market, holding a 56.9% revenue share as reported by Persistence Market Research, driven by widespread consumer focus on weight management and structured workout programming."),

  makeTable(
    ["Metric", "2025 Value", "Projected Value", "CAGR", "Source"],
    [
      ["Market Size", "$12.1B", "$33.6B by 2033", "13.5-15.6%", "Grand View / Polaris"],
      ["App Revenue", "$3.4B", "N/A", "24.5% YoY", "Business of Apps"],
      ["ARPU", "$4.45", "N/A", "N/A", "Statista"],
      ["Mental Health Apps", "$7.48B (2024)", "$35.3B by 2034", "14.6-18.2%", "Fortune BI / Grand View"],
    ]
  ),
  tableCaption("Table 1: Fitness and Mental Health App Market Overview (2025-2034)"),

  h2("The Youth-Specific Opportunity"),
  body("While the broader fitness app market is well-documented, the youth-specific segment is considerably less analyzed despite representing a significant portion of the addressable user base. According to the CDC, approximately 25.9% of teens with high daily screen time report depression symptoms, compared to just 9.5% among those with lower screen usage. Similarly, 27.1% of high-screen-time teens report anxiety symptoms versus 12.3% in the lower-usage cohort. These statistics, published in 2025, have intensified parental demand for digital tools that promote physical activity rather than passive consumption."),
  body("A 2024 systematic review published in JMIR mHealth found that mobile health (mHealth) app-based interventions can produce modest improvements in children's physical activity, diet, and weight outcomes. However, the effect sizes remain small, suggesting that current applications have not yet cracked the engagement code for younger demographics. The gap between the availability of adult-focused fitness tools and the near-absence of compelling, age-appropriate alternatives for users under 18 represents one of the largest untapped opportunities in the digital health landscape. Strava, the dominant social fitness platform with over 195 million athletes, requires users to be at least 13 years old and restricts several features for users under 18, including the Instant Workouts feature. There is effectively no major social fitness platform designed natively for users under 13."),
];

// --- CATEGORY ANALYSIS ---
const categoryAnalysis = [
  h1("Category Analysis: The Existing App Ecosystem"),

  // CAT 1
  h2("Category 1: Guided Exercise and Workout Apps for Kids"),
  h3("Overview and Key Players"),
  body("Guided exercise applications for children represent the most established category in the youth activity space, though it remains remarkably fragmented. These applications typically offer pre-recorded or animated exercise routines designed for specific age groups, ranging from simple stretching and yoga flows for preschoolers to more structured HIIT and strength training for older children and young teenagers. The category includes both standalone mobile applications and content libraries embedded within broader health platforms."),
  body("Among the most recognized players, GoNoodle has established itself as a dominant force in the elementary school market, offering movement and mindfulness videos that are widely used in classrooms across the United States. Cosmic Kids Yoga provides yoga-inspired storytelling content that has accumulated a substantial following on YouTube and its own platform. Sworkit Kids offers structured workout plans designed specifically for younger users, while the 7 Minute Workout for Kids provides quick, equipment-free exercise routines. The UNICEF Kid Power App takes a unique approach by tying physical activity to charitable impact, allowing children to unlock food packets for malnourished children through their own movement. More recent entrants include Exercise for Kids at Home on Google Play, which offers family-oriented workout content with warm-up exercises and varied difficulty levels."),

  makeTable(
    ["App", "Target Age", "Key Feature", "Monetization", "Limitation"],
    [
      ["GoNoodle", "5-10", "Classroom movement videos", "Freemium / School licenses", "School-focused, limited home use"],
      ["Cosmic Kids Yoga", "3-9", "Story-driven yoga", "YouTube + Subscription", "Narrow to yoga only"],
      ["Sworkit Kids", "6-14", "Structured workout plans", "Freemium", "Low retention, no social"],
      ["UNICEF Kid Power", "6-12", "Activity for charity impact", "Free (UNICEF funded)", "Limited exercise variety"],
      ["7 Min Workout Kids", "6-12", "Quick HIIT routines", "Free / Ads", "Very limited content depth"],
      ["Nike Training Club", "14+", "Pro-quality workouts", "Freemium ($14.99/mo)", "Not designed for kids"],
    ]
  ),
  tableCaption("Table 2: Guided Exercise Apps for Kids - Competitive Overview"),

  h3("Engagement Patterns and Critical Gaps"),
  body("The fundamental challenge across this category is retention. Guided exercise applications for children typically see high initial download rates driven by parental intent, but engagement drops precipitously within the first two weeks. Research from the children's hospital network (CHOP) notes that these apps function more as content libraries than engagement platforms. Without social features, progression systems, or adaptive difficulty, children quickly exhaust the available content and lose interest. The absence of peer interaction, competitive elements, or long-term progression mechanics means that these applications compete directly with far more engaging screen-based alternatives like YouTube, TikTok, and gaming platforms."),
  body("Furthermore, most applications in this category were designed for a pre-pandemic world where screen time was a secondary concern. In the current environment, where parents actively want to reduce total screen time, an application that requires a child to stare at a screen to follow exercise instructions represents a compromised value proposition. The most successful entries, such as GoNoodle, succeed precisely because they are used in structured environments (classrooms) where screen time is controlled and the social context of group participation drives engagement. Translating that engagement to the home environment, where children use devices individually, remains an unsolved problem."),

  // CAT 2
  h2("Category 2: Gamified Fitness and Active Gaming"),
  h3("The Pokemon GO Paradigm and Its Limits"),
  body("Pokemon GO, released by Niantic in 2016, remains the single most successful example of gamified physical activity in history. The augmented reality (AR) game demonstrated that location-based gaming could drive unprecedented levels of physical activity among children, teenagers, and adults alike. Research published in PMC documented that Pokemon GO players significantly increased their daily walking distance and step counts compared to pre-installation baselines. The game's success spawned a wave of imitators and established AR gaming as a legitimate category for promoting physical activity."),
  body("However, the Pokemon GO paradigm has significant limitations as a sustainable fitness tool. The game's engagement is driven primarily by collection mechanics and event-based content updates rather than by fitness progression. Players walk to hatch eggs and catch Pokemon, but the game provides no structured exercise programming, no progressive overload, and no fitness tracking beyond step counts. Research from the University of Georgia published in late 2024 demonstrated that new mixed reality games can help kids set and follow fitness goals with encouragement from parents and virtual pets, suggesting that the next generation of AR fitness games could be more structurally designed around exercise science. A 2025 study in JMIR Pediatrics tested AR exercise-game prototypes designed to train children's balance and coordination in children aged 4 to 9, with promising results on perceived ease of use and engagement."),

  h3("Current Active Gaming Landscape"),
  body("Beyond Pokemon GO, the active gaming space includes VR fitness applications (such as Beat Saber, Supernatural, and FitXR) that have found some traction among teenagers and young adults. Garmin's Vivofit Jr. 3 incorporates chore-management gamification where children earn rewards for both physical activity and household tasks. The Fitbit Ace 3 provides step tracking, active minutes, and sleep monitoring for children aged 6 and above. However, these hardware-adjacent gamification features are relatively simplistic compared to what modern game design principles could offer. The 2025 landscape of gamified fitness apps ranked by Yu-kai Chou's Octalysis framework highlights that the most engaging fitness gamification systems use core drives such as epic meaning, development accomplishment, and social influence, elements that are largely absent from children's activity applications."),

  makeTable(
    ["Platform", "Type", "Age", "Activity Metric", "Gamification Level", "Limitation"],
    [
      ["Pokemon GO", "AR Mobile", "All ages", "Walking / Steps", "Medium", "No structured fitness"],
      ["Beat Saber", "VR", "13+", "Full body movement", "High", "Requires VR headset ($300+)"],
      ["Garmin Vivofit Jr. 3", "Wearable", "4-12", "Steps / Activity", "Low-Medium", "Simple chore gamification"],
      ["Fitbit Ace 3", "Wearable", "6+", "Steps / Sleep", "Low", "Minimal gamification"],
      ["SuperStretch Yoga", "Mobile App", "3-8", "Yoga / Stretching", "Low", "Narrow content scope"],
      ["UGA Mixed Reality", "AR Prototype", "6-12", "Custom activities", "Medium", "Academic prototype only"],
    ]
  ),
  tableCaption("Table 3: Gamified Fitness and Active Gaming Platforms"),

  // CAT 3
  h2("Category 3: Social Activity Platforms for Youth"),
  h3("The Strava Problem"),
  body("Strava, with over 195 million registered athletes across more than 185 countries, is the dominant social fitness platform globally. However, Strava's relationship with younger users is fraught with complexity. The platform requires users to be at least 13 years old, effectively excluding the entire under-13 demographic. For users between 13 and 17, Strava applies restrictive default privacy settings: profiles are set to private by default, the Instant Workouts feature is disabled, and health-related data processing is restricted. These restrictions, while well-intentioned from a safety perspective, severely limit the platform's appeal for teen users who are seeking the social validation and community features that make Strava compelling for adults."),
  body("A revealing Reddit discussion from a parent whose 15-year-old daughter wanted to join Strava highlighted the community's ambivalence toward teen users. While some parents encouraged participation as a way to support a child's existing athletic interests (the daughter was a track athlete with a 5:45 mile time), others expressed concern about location data exposure and social pressure. Strava's recent partnership with Common Sense Media to advance digital and physical well-being for kids and families signals the company's awareness of this gap, but the fundamental architecture of Strava, built around public activity feeds and location-based route sharing, is difficult to retrofit for younger users without compromising the features that make it attractive."),
  body("The absence of a social fitness platform designed natively for users under 18 represents perhaps the single largest gap in the current market. Existing alternatives include Cyclemeter for cycling tracking and Garmin's ecosystem for data collection, but neither provides the social community features that drive engagement on Strava. Parents of younger children are left to either manage a Strava account on their child's behalf (violating terms of service) or abandon social fitness features entirely. This gap is particularly acute for children aged 8 to 13 who are old enough to participate in organized sports and independent physical activities but too young for mainstream social fitness platforms."),

  // CAT 4
  h2("Category 4: Family Fitness and Parent-Child Challenge Apps"),
  h3("Current Offerings and Family Dynamics"),
  body("Family fitness applications attempt to bridge the gap between individual exercise tracking and the inherently social nature of family physical activity. The category includes applications specifically designed for parent-child workouts, family challenges, and multi-generational fitness routines. Leading examples include GoNoodle and Cosmic Kids Yoga (which serve dual purposes as both individual and family content platforms), GymRats for group fitness challenges, and more specialized applications like JeevaJoy Family Fitness, which offers structured parent-child workout routines and family bonding activities."),
  body("A 2022 study published in PMC examined the feasibility of using activity trackers and apps to increase physical activity in whole families, finding that while families were generally receptive to the concept, the applications tested lacked the design sophistication to sustain long-term engagement. The study identified several key barriers: inconsistent device ownership across family members (parents had smartphones, younger children did not), mismatched fitness goals between parents and children, and the absence of family-appropriate social features that could accommodate both competitive and cooperative dynamics. WallPilates, noted for its minimal equipment requirements and joint-friendly progressions, has gained traction among families looking for living-room exercise options that do not require dedicated gear or large spaces."),
  body("The family fitness category suffers from a fundamental design tension: applications must simultaneously appeal to parents (who control the purchasing decision and value structured health outcomes) and children (who control engagement and demand fun, gamified experiences). Most current applications optimize for one audience at the expense of the other, resulting in products that either feel too childish for parents or too clinical for children. Fitbit's family approach, combining parent-view dashboards with child accounts that show steps, active minutes, and streaks, represents one of the more successful attempts to serve both audiences, but it is constrained by the limitations of the Fitbit Ace hardware ecosystem."),

  // CAT 5
  h2("Category 5: Wearable-Integrated Kids Activity Ecosystems"),
  h3("Hardware Landscape"),
  body("The children's wearable market has matured significantly since the introduction of the original Fitbit Ace, with several major manufacturers now offering dedicated fitness trackers and smartwatches for younger users. Garmin leads the segment with the Vivofit Jr. 3 (for ages 4+), featuring a color display, swim-friendly design, up to one year of battery life, and integrated chore management with customizable rewards. The Garmin Bounce, a more advanced kids' smartwatch with GPS tracking, phone-free texting, and voice messaging, represents the premium end of the market and has been recognized by the New York Times as a top pick for 2025-2026. Fitbit's Ace 3, recommended for children aged 6 and above, tracks steps, active minutes, and sleep while offering reminders to move."),
  body("The wearable ecosystem for children serves a dual purpose that creates both opportunity and complexity. For parents, these devices provide peace of mind through location tracking and activity monitoring. For children, the gamification features (step challenges, virtual badges, chore rewards) provide motivation to stay active. However, the software ecosystems accompanying these wearables remain relatively limited compared to adult fitness platforms. Garmin's Jr. app provides basic data visualization and chore management, while Fitbit's family view offers step counting and streak tracking. Neither platform offers the rich social features, third-party integrations, or community aspects that characterize the adult wearable ecosystem. The hardware is capable; the software ecosystem is not."),

  makeTable(
    ["Device", "Age Range", "Key Features", "Price Range", "Software Limitation"],
    [
      ["Garmin Vivofit Jr. 3", "4+", "Steps, chores, 1yr battery, swim-proof", "$60-80", "No social, basic app"],
      ["Garmin Bounce", "6+", "GPS, texting, voice, location", "$150-200", "Subscription for comms"],
      ["Fitbit Ace 3", "6+", "Steps, active min, sleep, reminders", "$70-100", "Limited gamification"],
      ["Xplora XGO3", "4+", "GPS, calling, school mode, steps", "$130-160", "Europe-focused"],
      ["Pinwheel Watch", "8+", "Safe phone, curated apps", "$200-250", "Very limited fitness"],
    ]
  ),
  tableCaption("Table 4: Kids Wearable Fitness Trackers - Competitive Landscape"),
];

// --- REGULATORY ---
const regulatory = [
  h1("Regulatory Landscape"),
  h2("COPPA 2025 Amendments"),
  body("The Children's Online Privacy Protection Act (COPPA) underwent significant amendments finalized in April 2025, with the revised rule taking effect on June 23, 2025. These amendments represent the most substantial update to children's digital privacy regulation since COPPA's original enactment in 1998 and have profound implications for any startup operating in the youth activity application space. The Federal Trade Commission (FTC) recognized that changes in how children utilize online services necessitated further revisions to ensure COPPA continues to protect children's online privacy in the modern digital landscape."),
  body("The amended rule introduces expanded requirements around the collection, use, and disclosure of children's personal information. Operators of websites and online services directed to children under 13 must now implement more robust data minimization practices, strengthen their data security requirements, and provide clearer disclosures to parents about data practices. Critically, the amended COPPA rule also impacts platforms that have actual knowledge that they are collecting personal information from children under 13, even if the platform is not primarily directed at children. This means that a social fitness platform targeting teenagers aged 13-17 must carefully design its age-gating and data collection practices to avoid inadvertently collecting data from younger children who may misrepresent their age."),
  body("The regulatory complexity extends beyond federal law. New York's Child Data Protection Act, which took effect in June 2025 alongside the COPPA amendments, creates additional compliance requirements specific to New York State. By October 22, 2025, all approved Safe Harbor programs were required to submit revised guidelines to the FTC reflecting the updated COPPA requirements, including detailed explanations of how they will monitor compliance and enforce standards. For startups, the practical implication is that COPPA compliance can no longer be treated as a checkbox exercise during late-stage development. Privacy-by-design must be a foundational architectural principle from day one."),

  h2("Implications for Startup Design"),
  body("The regulatory environment creates both constraints and competitive advantages for new entrants. The constraints are significant: any application that knowingly collects data from children under 13 must obtain verifiable parental consent, maintain strict data minimization practices, provide parents with the right to review and delete their children's data, and ensure that third-party services (analytics, advertising, cloud storage) also comply with COPPA requirements. These requirements add engineering complexity and legal costs that can be particularly burdensome for early-stage startups with limited resources."),
  body("However, the regulatory environment also creates a meaningful competitive moat. The 2025 COPPA amendments have raised the compliance bar sufficiently that many incumbents, particularly those whose architectures were designed under the previous regulatory regime, face significant retrofitting costs. A new entrant that designs for COPPA 2025 compliance from the ground level can achieve both better compliance and better user experience (through privacy-preserving design patterns) than incumbents who are bolting compliance onto legacy systems. Furthermore, the trend toward stricter regulation globally (including GDPR in Europe and emerging legislation in other jurisdictions) means that a COPPA-compliant architecture is likely to be substantially compliant with future regulations as well."),
];

// --- GAP ANALYSIS ---
const gapAnalysis = [
  h1("Competitive Gap Analysis"),
  body("Synthesizing the findings from the five-category analysis and regulatory review, several critical gaps emerge in the current market. These gaps represent actionable opportunities for startups that can execute against them with appropriate technical and design capabilities. The following analysis ranks these gaps by market size, competitive intensity, and feasibility of execution for a well-resourced early-stage team."),

  makeTable(
    ["Gap", "Severity", "Market Potential", "Regulatory Risk", "Execution Complexity"],
    [
      ["No social fitness platform for ages 8-17", "Critical", "Very High", "Medium", "High"],
      ["AR/VR active gaming post-Pokemon GO", "High", "High", "Low", "Very High"],
      ["Family fitness with true dual-audience design", "High", "Medium-High", "Low-Medium", "Medium"],
      ["Mental health + physical activity integration for teens", "Medium-High", "High", "Medium", "Medium"],
      ["Wearable ecosystem open platform for kids", "Medium", "Medium", "Medium", "High"],
      ["School-to-home activity continuity", "Medium", "Medium", "Low", "Low-Medium"],
    ]
  ),
  tableCaption("Table 5: Competitive Gap Analysis - Ranked by Severity and Potential"),

  h2("The Social Fitness Void (Ages 8-17)"),
  body("The most critical gap in the current market is the complete absence of a social fitness platform designed natively for users between the ages of 8 and 17. This is not a minor feature gap; it is a category-level absence. For adult users, Strava provides social activity tracking, competitive leaderboards, route discovery, and community features that transform solitary exercise into a shared experience. For children and young teenagers, no equivalent platform exists. The consequences are measurable: physical activity levels decline sharply as children enter adolescence, precisely the age range where social motivation becomes the dominant driver of behavior."),
  body("The challenge of building such a platform is primarily regulatory and design-oriented rather than technical. COPPA compliance for the under-13 segment requires verifiable parental consent and strict data minimization. For the 13-17 segment, while COPPA does not directly apply, the FTC has signaled increased scrutiny of data practices affecting teenagers, and several states are considering or have enacted legislation extending protections to minors under 18. The design challenge is equally formidable: creating a social platform that provides genuine peer interaction and motivation while maintaining age-appropriate safety standards requires careful balance between engagement and protection."),

  h2("Mental Health and Physical Activity Integration"),
  body("The intersection of mental health and physical activity represents a rapidly growing market segment that is particularly relevant for teenagers. The global mental health apps market was valued at $7.48 billion in 2024 (Grand View Research) and is projected to grow at a CAGR of 14.6% through 2030. The depression and anxiety management segment dominates this market, reflecting the rising rates of mental health challenges among young people. However, the vast majority of mental health applications focus exclusively on cognitive interventions (meditation, mood tracking, therapy access) without addressing the well-documented relationship between physical activity and mental health outcomes."),
  body("Research published in the National Library of Medicine in 2025 found that three weeks of screen time reduction showed small to medium effect sizes on depressive symptoms, stress, sleep quality, and overall well-being. A separate CDC study published in 2025 found that teens with high daily screen time were significantly more likely to experience both depression (25.9% vs. 9.5%) and anxiety (27.1% vs. 12.3%). These findings suggest that an application which simultaneously reduces passive screen time, increases physical activity, and provides mental health support could address a triple burden with a single intervention. No current application effectively integrates all three of these elements for a teenage audience."),
];

// --- STARTUP IDEAS ---
const startupIdeas = [
  h1("Startup Opportunity Ideas"),

  // IDEA 1
  h2("Idea 1: Strava for the Next Generation (Working Name: Kinetic)"),
  h3("Concept"),
  body("Kinetic is a social fitness platform purpose-built for users aged 13 to 25, designed from the ground up to address the safety, privacy, and engagement requirements of younger users while providing the social motivation and community features that drive sustained physical activity. The platform combines activity tracking (steps, active minutes, workout logging, sport-specific metrics) with a privacy-first social layer that enables peer interaction without the risks inherent in retrofitting adult-oriented platforms for younger users."),

  h3("Key Differentiators"),
  body("The core differentiator is the age-graduated permission system. Unlike Strava, which applies a blanket set of restrictions to all users under 18, Kinetic would implement a tiered model where features unlock progressively as users age and demonstrate responsible platform behavior. Users aged 13-15 would have private profiles by default, with social features limited to approved connections (friends from school, sports teams, or family). Users aged 16-17 would gain access to broader discovery features and group challenges, while users aged 18-25 would have access to the full feature set including public leaderboards and route sharing. This graduated approach balances safety with the growing autonomy demands of adolescent development."),
  body("The second differentiator is the integration of mental health check-ins alongside physical activity data. Rather than treating mental health as a separate concern, Kinetic would prompt users with brief, evidence-based mood assessments after workouts, creating a longitudinal dataset that shows the correlation between activity patterns and emotional well-being. This data would be presented to users in a private, non-judgmental format and could optionally be shared with parents or mental health professionals. The approach draws on research demonstrating that physical activity is one of the most effective interventions for mild to moderate depression and anxiety in adolescents, yet most teenagers are not aware of this connection."),

  h3("Technical Architecture and Data Strategy"),
  body("The platform would be built on a privacy-by-design architecture that implements data minimization at every layer. Location data would be processed on-device to extract activity metrics (distance, pace, route shape) without storing raw GPS coordinates on servers. Social features would use end-to-end encryption for direct messages and would not employ algorithmic content recommendation systems that rely on behavioral profiling. The COPPA compliance strategy would include robust age verification (combining parental consent workflows for under-13 users with age estimation technology for the 13-17 segment), comprehensive data retention limits, and transparent data practices that exceed the minimum regulatory requirements."),

  makeTable(
    ["Feature", "Ages 13-15", "Ages 16-17", "Ages 18-25"],
    [
      ["Profile Visibility", "Private (connections only)", "Semi-private", "Public optional"],
      ["Activity Sharing", "Approved friends only", "Friends + groups", "Full social"],
      ["Challenges", "1-on-1 + family", "Group challenges", "Public leaderboards"],
      ["Route Discovery", "None", "School/team routes", "Full map"],
      ["Mental Health Check-ins", "Yes (private)", "Yes (optional share)", "Yes (full control)"],
      ["Location Data", "On-device only", "On-device + summary", "Cloud with controls"],
    ]
  ),
  tableCaption("Table 6: Kinetic - Age-Graduated Feature Matrix"),

  h3("Monetization"),
  body("Kinetic would employ a freemium model with a generous free tier designed to maximize adoption among the target demographic. The free tier would include core activity tracking, limited social features, and basic mental health check-ins. A premium subscription ($4.99/month or $39.99/year) would unlock advanced analytics, custom training plans, group challenge creation, and enhanced mental health insights. A family plan ($9.99/month) would allow up to 5 family members with a parent dashboard. Revenue would be supplemented by B2B partnerships with schools, youth sports leagues, and pediatric healthcare providers who would pay for organizational dashboards and cohort analytics. This multi-sided revenue model reduces dependence on any single revenue stream and creates natural viral loops through school and team-based adoption."),

  // IDEA 2
  h2("Idea 2: AR Active Gaming Platform (Working Name: RealmRider)"),
  h3("Concept"),
  body("RealmRider is an augmented reality gaming platform that transforms real-world physical activity into a persistent, narrative-driven game experience. Unlike Pokemon GO, which uses physical activity as a byproduct of collection mechanics, RealmRider would design its core game loop around exercise science principles. Players would choose from multiple activity types (running, cycling, walking, skating, basketball, soccer) and would earn in-game currency, experience points, and narrative progression proportional to the intensity and duration of their real-world physical activity, as measured by smartphone sensors or connected wearables."),
  body("The platform would use AR technology to overlay game elements onto the real world through the smartphone camera. Unlike Pokemon GO's location-based model, which requires players to visit specific real-world locations, RealmRider would use procedural generation to create game content based on the player's immediate environment and chosen activity. A child riding a bicycle through their neighborhood would encounter procedurally generated challenges, collectible items, and narrative events that appear through their phone's camera view, with the difficulty and frequency of encounters calibrated to the child's fitness level and the intensity of their current activity. This approach addresses Pokemon GO's key limitation: dependency on specific geographic locations that may be inaccessible or unsafe for children."),

  h3("Technical Feasibility and Investment Requirements"),
  body("The technical requirements for RealmRider are substantial but achievable with current technology. Core technologies include ARKit/ARCore for device-level augmented reality rendering, GPS and accelerometer data fusion for activity tracking, procedural content generation algorithms for dynamic game world creation, and a cloud backend for player progression persistence and multiplayer features. The primary technical risk is battery consumption, as continuous AR rendering and GPS tracking can drain a smartphone battery within 60-90 minutes. Mitigation strategies include adaptive rendering quality (reducing AR fidelity when battery is low), periodic rather than continuous AR activation (AR encounters triggered at intervals rather than constant overlay), and integration with wearable sensors to reduce reliance on phone-based activity detection."),
  body("Estimated initial development costs range from $1.5 million to $3 million for a minimum viable product (MVP) including core AR mechanics, three to five activity types, basic multiplayer features, and backend infrastructure. A full commercial launch would likely require $5 million to $10 million in total investment, with the majority allocated to content creation (3D assets, narrative design, sound design) and server infrastructure for multiplayer features. The revenue model would combine a free-to-play base with in-app purchases (cosmetic items, narrative expansions, activity-specific content packs) and an optional premium subscription ($5.99/month) offering ad-free experience, exclusive content, and enhanced progression features."),

  // IDEA 3
  h2("Idea 3: Family Fitness OS (Working Name: TeamMove)"),
  h3("Concept"),
  body("TeamMove is a family-unit fitness platform that treats the household as the fundamental organizational unit rather than the individual. The platform would aggregate activity data from multiple sources (smartphone sensors, Garmin wearables, Fitbit devices, Apple Watch, Google Fit, Apple Health) into a unified family dashboard where parents can set household activity goals, create intra-family challenges, and track collective progress. The key innovation is the dual-audience design that simultaneously provides parents with meaningful health analytics and children with engaging, gamified experiences that make physical activity feel like play rather than obligation."),
  body("The platform would feature adaptive challenge generation that accounts for the varying fitness levels and preferences of different family members. A weekly family challenge might ask a parent to complete three 30-minute runs while a 7-year-old completes 60 minutes of active play and a teenager logs two basketball sessions. Progress would be visualized on a shared family dashboard with celebratory animations, milestone badges, and virtual rewards that the family can redeem collectively (movie night, pizza party, trip to an amusement park). The collaborative rather than purely competitive design ensures that family members of different fitness levels can contribute meaningfully without the discouragement that arises when a child is compared directly against a fitter parent or older sibling."),

  h3("Integration Strategy and Go-to-Market"),
  body("TeamMove's go-to-market strategy would leverage existing wearable hardware rather than requiring new device purchases. By integrating with Garmin's Connect API, Fitbit's Web API, Apple HealthKit, and Google Fit, TeamMove can aggregate data from devices that families already own, eliminating the hardware adoption barrier that has limited the reach of previous family fitness applications. The integration-first approach also creates a natural onboarding path: families who already use Fitbit or Garmin for individual tracking can install TeamMove to add a social, family-oriented layer on top of their existing data without changing their hardware or individual tracking habits."),
  body("The B2C monetization model would center on a family subscription ($7.99/month or $59.99/year) with a 30-day free trial. The free tier would support basic family activity tracking for up to 3 family members, while the premium tier would unlock advanced challenges, health analytics, integration with more than two wearable brands, and priority customer support. A B2B channel would target pediatric healthcare providers, family therapy practices, and corporate wellness programs that include family health components, offering white-label dashboard solutions and cohort analytics for a per-family licensing fee. Strategic partnerships with Garmin and Fitbit for co-marketing and platform integration would provide additional distribution channels with relatively low customer acquisition costs."),

  makeTable(
    ["Dimension", "Kinetic (Social Fitness)", "RealmRider (AR Gaming)", "TeamMove (Family OS)"],
    [
      ["Target User", "Teens 13-25", "Kids 8-17", "Family households"],
      ["Core Loop", "Track + Share + Compete", "Move to Progress Game", "Family Goals + Challenges"],
      ["Key Moat", "Age-graduated privacy system", "AR content engine", "Multi-wearable integration"],
      ["Revenue Model", "Freemium + Family + B2B", "F2P + IAP + Sub", "Family Sub + B2B"],
      ["Est. MVP Cost", "$800K - $1.5M", "$1.5M - $3M", "$600K - $1.2M"],
      ["Time to MVP", "6-8 months", "10-14 months", "5-7 months"],
      ["Primary Risk", "Regulatory / Trust", "Technical / Battery", "Adoption / Engagement"],
      ["COPPA Exposure", "Medium (13+ focus)", "High (under-13 play)", "Low (parent-managed)"],
    ]
  ),
  tableCaption("Table 7: Startup Opportunity Comparison Matrix"),
];

// --- RISK ANALYSIS ---
const riskAnalysis = [
  h1("Risk Analysis and Mitigation"),

  h2("Regulatory and Compliance Risk"),
  body("The most significant risk facing any startup in the youth activity space is regulatory compliance, particularly under the 2025 COPPA amendments. Non-compliance penalties can reach $50,120 per violation under the FTC's updated penalty schedule, and the agency has demonstrated increased willingness to pursue enforcement actions against technology companies that fail to protect children's data. The amended COPPA rule also expands the definition of personal information to include broader categories of data, potentially encompassing biometric data (heart rate, sleep patterns) collected by activity tracking applications. Mitigation requires engaging privacy counsel during the design phase, implementing a comprehensive data mapping exercise, and building COPPA compliance testing into the CI/CD pipeline."),

  h2("Engagement and Retention Risk"),
  body("The youth activity application space is littered with well-intentioned products that failed to sustain engagement beyond an initial novelty period. The fundamental challenge is competing for children's attention against highly optimized entertainment platforms (YouTube, TikTok, Roblox) that employ sophisticated engagement mechanics refined through billions of hours of user data. An activity application must provide engagement that is competitive with these platforms while promoting a fundamentally different behavior (physical movement rather than passive consumption). This tension is difficult to resolve. Mitigation strategies include rapid content iteration (weekly new challenges, seasonal events), social features that create peer accountability, and integration with existing social circles (school teams, friend groups) rather than attempting to build new social graphs from scratch."),

  h2("Hardware Dependency Risk"),
  body("Applications that depend on wearable hardware (particularly for younger children) face adoption barriers related to device cost, battery life, and the reality that many parents are reluctant to provide young children with expensive electronics. The Garmin Vivofit Jr. 3 at $60-80 represents the affordable end of the market, while the Garmin Bounce at $150-200 plus a subscription fee for communication features represents a significant parental investment. Applications that require specific hardware will have a smaller addressable market than those that work with standard smartphones. Mitigation requires designing for phone-first experiences while offering enhanced features for wearable users, and supporting a broad range of wearable brands rather than locking into a single ecosystem."),

  h2("Safety and Trust Risk"),
  body("Any social platform for minors must anticipate and prevent abuse scenarios including unwanted contact from adults, cyberbullying, location exposure, and inappropriate content sharing. A single high-profile safety incident can destroy the trust that parents place in a youth-oriented platform, potentially ending the business overnight. Mitigation requires implementing robust age verification, content moderation systems (both AI-powered and human-reviewed), parental oversight tools, and a transparent incident response process. The investment in safety infrastructure should be proportionate to the target age range, with the highest standards applied to platforms serving children under 13."),
];

// --- CONCLUSIONS ---
const conclusions = [
  h1("Conclusions and Recommendations"),
  body("The youth activity application market sits at the intersection of several powerful trends: a $12+ billion and rapidly growing fitness app market, rising concern over childhood inactivity and screen time, an evolving regulatory landscape that raises barriers for incumbents, and a generation of young people who are digital natives but lack age-appropriate tools to support their physical well-being. The competitive landscape across all five categories analyzed in this report reveals a market that is large, growing, and comprehensively underserved."),
  body("Among the three startup opportunities identified, we recommend prioritizing TeamMove (the Family Fitness OS) as the initial product due to its lower capital requirements, faster time to MVP, and lower regulatory risk profile. The family-unit approach leverages existing wearable hardware, targets parents as the purchasing decision-makers, and sidesteps the most complex COPPA compliance challenges by operating through parent-managed accounts. Once TeamMove establishes market presence and brand trust, the team should develop Kinetic (the social fitness platform for teens) as a second product, leveraging the user base and wearable integration infrastructure built for TeamMove. RealmRider (the AR gaming platform) represents the highest-risk, highest-reward opportunity and should be pursued as a longer-term strategic initiative contingent on the success of the first two products."),
  body("The critical success factors across all three opportunities are consistent: privacy-by-design architecture built for COPPA 2025 from day one, engagement mechanics that are genuinely competitive with entertainment-only alternatives, integration with existing hardware ecosystems rather than proprietary hardware, and a go-to-market strategy that leverages institutional channels (schools, pediatric healthcare, youth sports organizations) to reduce customer acquisition costs. The window of opportunity is open but not indefinite; as regulatory scrutiny increases, the first-mover advantage will accrue to the startup that demonstrates both compliance excellence and genuine engagement innovation."),
];

// ═══════════════════════════════════════════════════════
// DOCUMENT ASSEMBLY
// ═══════════════════════════════════════════════════════
const coverPalette = {
  bg: "0B1C2C", titleColor: "FFFFFF", subtitleColor: "B0B8C0",
  metaColor: "90989F", footerColor: "687078", accent: "529286",
};

const coverConfig = {
  title: "Youth Activity App Market: Research and Startup Opportunity Analysis",
  subtitle: "Identifying White Space in the $12B+ Fitness Application Ecosystem for Children, Teens, and Young Adults",
  englishLabel: "PRODUCT RESEARCH REPORT",
  metaLines: ["Prepared for Internal Strategy Team", "August 2026"],
  footerLeft: "Confidential", footerRight: "Product Research Division",
  palette: coverPalette,
};

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Times New Roman" }, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: { run: { font: { ascii: "Times New Roman" }, size: 32, bold: true, color: P.primary } },
      heading2: { run: { font: { ascii: "Times New Roman" }, size: 28, bold: true, color: P.primary } },
      heading3: { run: { font: { ascii: "Times New Roman" }, size: 24, bold: true, color: P.primary } },
    },
  },
  sections: [
    // COVER
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1(coverConfig),
    },
    // TOC
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
      },
      children: [
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: "Table of Contents", size: 36, bold: true, color: P.primary, font: { ascii: "Times New Roman" } })],
        }),
        new TableOfContents("Table of Contents", {
          hyperlink: true, headingStyleRange: "1-3",
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 300 },
          children: [new TextRun({ text: "(Right-click the table of contents and select \"Update Field\" to refresh page numbers after opening in Word)", size: 18, color: P.secondary, font: { ascii: "Calibri", italics: true } })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // BODY
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT, spacing: { after: 0 },
            children: [new TextRun({ text: "Youth Activity App Market Research", size: 18, color: "808080", font: { ascii: "Calibri" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Page ", size: 18, color: "808080", font: { ascii: "Calibri" } }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: { ascii: "Calibri" } })],
          })],
        }),
      },
      children: [
        ...execSummary,
        ...marketOverview,
        ...categoryAnalysis,
        ...regulatory,
        ...gapAnalysis,
        ...startupIdeas,
        ...riskAnalysis,
        ...conclusions,
      ],
    },
  ],
});

const OUTPUT = "/home/z/my-project/download/Youth_Activity_App_Market_Research_Report.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Document generated: " + OUTPUT);
}).catch(err => {
  console.error("Error generating document:", err);
  process.exit(1);
});
