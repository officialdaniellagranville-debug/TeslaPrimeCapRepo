#!/usr/bin/env python3
"""
AI Data Annotation Platform Review for Nigeria - PDF Report Generator
Comprehensive evidence-based analysis of 9 platforms for Nigerian beginners.
"""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.colors import HexColor

# ─── FONT REGISTRATION ──────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
# Also register regular DejaVu for symbols
pdfmetrics.registerFont(TTFont('DejaVuSansReg', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
# Noto Sans SC is a variable font that ReportLab can't handle, skip it

registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ─── CASCADE PALETTE (auto-generated) ──────────────────────────────
PAGE_BG       = HexColor('#f5f6f6')
SECTION_BG    = HexColor('#f0f2f2')
CARD_BG       = HexColor('#ebedee')
TABLE_STRIPE  = HexColor('#eaecee')
HEADER_FILL   = HexColor('#2f454f')
COVER_BLOCK   = HexColor('#53656e')
BORDER        = HexColor('#bcccd4')
ICON          = HexColor('#3c6980')
ACCENT        = HexColor('#1f6c92')
ACCENT_2      = HexColor('#ba475a')
TEXT_PRIMARY   = HexColor('#1c1e1f')
TEXT_MUTED     = HexColor('#767d80')
SEM_SUCCESS   = HexColor('#427e56')
SEM_WARNING   = HexColor('#978051')
SEM_ERROR     = HexColor('#ae4d44')
SEM_INFO      = HexColor('#517191')

# ─── OUTPUT PATH ─────────────────────────────────────────────────────
OUTPUT_DIR = '/home/z/my-project/download'
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'AI_Platforms_Nigeria_Review.pdf')
BODY_FILE = os.path.join(OUTPUT_DIR, '_body_temp.pdf')

# ─── STYLES ───────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

title_style = ParagraphStyle('DocTitle', fontName='FreeSerif-Bold', fontSize=28,
    leading=34, alignment=TA_CENTER, textColor=TEXT_PRIMARY, spaceAfter=6)

subtitle_style = ParagraphStyle('Subtitle', fontName='FreeSerif-Italic', fontSize=14,
    leading=18, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=20)

h1_style = ParagraphStyle('H1', fontName='FreeSerif-Bold', fontSize=20,
    leading=26, textColor=HEADER_FILL, spaceBefore=24, spaceAfter=12,
    borderWidth=0, borderPadding=0)

h2_style = ParagraphStyle('H2', fontName='FreeSerif-Bold', fontSize=15,
    leading=20, textColor=ICON, spaceBefore=18, spaceAfter=8)

h3_style = ParagraphStyle('H3', fontName='FreeSerif-Bold', fontSize=12,
    leading=16, textColor=ACCENT, spaceBefore=12, spaceAfter=6)

body_style = ParagraphStyle('Body', fontName='FreeSerif', fontSize=10.5,
    leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
    spaceBefore=2, spaceAfter=6, firstLineIndent=0)

body_left = ParagraphStyle('BodyLeft', fontName='FreeSerif', fontSize=10.5,
    leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=2, spaceAfter=4)

bullet_style = ParagraphStyle('Bullet', fontName='FreeSerif', fontSize=10.5,
    leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    leftIndent=18, bulletIndent=6, spaceBefore=2, spaceAfter=2)

small_style = ParagraphStyle('Small', fontName='FreeSerif-Italic', fontSize=9,
    leading=13, textColor=TEXT_MUTED, alignment=TA_LEFT)

meta_style = ParagraphStyle('Meta', fontName='FreeSerif', fontSize=9,
    leading=13, textColor=TEXT_MUTED, alignment=TA_LEFT)

callout_style = ParagraphStyle('Callout', fontName='FreeSerif-Bold', fontSize=11,
    leading=16, textColor=ACCENT, alignment=TA_LEFT,
    leftIndent=12, borderWidth=0, spaceBefore=6, spaceAfter=6)

verdict_good = ParagraphStyle('VerdictGood', fontName='FreeSerif-Bold', fontSize=11,
    leading=15, textColor=SEM_SUCCESS, spaceBefore=4, spaceAfter=4)

verdict_bad = ParagraphStyle('VerdictBad', fontName='FreeSerif-Bold', fontSize=11,
    leading=15, textColor=SEM_ERROR, spaceBefore=4, spaceAfter=4)

verdict_warn = ParagraphStyle('VerdictWarn', fontName='FreeSerif-Bold', fontSize=11,
    leading=15, textColor=SEM_WARNING, spaceBefore=4, spaceAfter=4)

score_style = ParagraphStyle('Score', fontName='FreeSerif-Bold', fontSize=22,
    leading=26, textColor=ACCENT, alignment=TA_CENTER, spaceBefore=4, spaceAfter=4)

# ─── TABLE STYLE HELPERS ────────────────────────────────────────────
def make_table_style(num_rows):
    """Standard table style with alternating rows."""
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'FreeSerif-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9.5),
        ('FONTNAME', (0, 1), (-1, -1), 'FreeSerif'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('LEADING', (0, 0), (-1, -1), 14),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, num_rows):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
        else:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), colors.white))
    return TableStyle(style_cmds)


def safe_p(text):
    """Sanitize text for Paragraph objects."""
    import re
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r'[\u200b-\u200f\u2028-\u202f\u2060\ufeff]', '', text)
    text = text.replace('\ufffd', '')
    text = re.sub(r'[\ufe00-\ufe0f]', '', text)
    text = re.sub(r'[\ue000-\uf8ff]', '', text)
    # Also escape XML entities
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return text


def B(text):
    """Bold wrapper."""
    return f'<b>{safe_p(text)}</b>'

def I(text):
    """Italic wrapper."""
    return f'<i>{safe_p(text)}</i>'

def BI(text):
    """Bold + Italic wrapper."""
    return f'<b><i>{safe_p(text)}</i></b>'

def bullet(text):
    """Bullet point."""
    return Paragraph(f'<bullet>&bull;</bullet> {safe_p(text)}', bullet_style)

def body(text):
    return Paragraph(safe_p(text), body_style)

def body_l(text):
    return Paragraph(safe_p(text), body_left)

def small(text):
    return Paragraph(safe_p(text), small_style)

def sp(h=12):
    return Spacer(1, h)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PLATFORM DATA — Evidence-based, compiled from 18+ web searches
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PLATFORMS = [
    {
        'name': 'CrowdGen (Appen)',
        'website': 'crowdgen.com',
        'overview': 'CrowdGen is the contributor platform of Appen, a publicly traded company listed on the Australian Securities Exchange (APX). Appen has been in the AI data annotation industry since 1996 and is one of the oldest and most established companies in the space. The CrowdGen platform connects over 1 million contributors worldwide with AI training projects, offering tasks that range from image labeling to text evaluation and voice recording.',
        'legitimate': 'Yes. Appen is a publicly traded company (ASX: APX) with a 28+ year track record. CrowdGen is its official contributor platform. This is one of the most verifiably legitimate platforms in the AI data annotation industry.',
        'consistent_payments': 'Mostly yes, but with significant complaints. Appen has paid contributors for decades. However, Trustpilot reviews (2.0/5 rating from hundreds of reviews) frequently cite delayed payments, unpaid qualification time, and sudden account deactivations without explanation. Payments do arrive for most contributors, but the process is often frustrating.',
        'nigeria_available': 'Yes. CrowdGen/Appen accepts contributors from Nigeria. Multiple Nigerian-focused guides (Zikoko, AfrikStories) confirm this. Nigerian contributors can register, access projects, and receive payments.',
        'country_restrictions': 'Some projects are geo-restricted. Certain high-paying tasks are only available in specific countries (US, UK, EU). Nigerian contributors typically see fewer project opportunities than contributors in Western countries.',
        'registration': 'Sign up at crowdgen.com with email. Complete profile with personal details, language skills, and professional expertise. No upfront fees required.',
        'id_verification': 'Government-issued ID (national ID card, passport, or voter card). Address verification may be required. Tax information (W-8BEN for international contributors) must be completed before first payment.',
        'payment_methods': 'PayPal is the primary method for Nigerian contributors. Bank transfer via Payoneer is also available in some cases. Direct bank transfer to Nigerian accounts is limited.',
        'payment_schedule': 'Biweekly or monthly, depending on the project. Some projects pay weekly. Payment thresholds may apply (minimum $5-$10 before withdrawal).',
        'earnings_beginner': '$3-$8/hour for basic tasks (image labeling, search evaluation). Experienced contributors in specialized domains can earn $10-$20/hour.',
        'earnings_experienced': '$10-$25/hour for domain-specific tasks (coding, medical, legal). Rare high-value projects can pay $30+/hour.',
        'task_types': 'Image annotation, text classification, search relevance evaluation, voice recording, transcription, sentiment analysis, data collection, AI model evaluation.',
        'skills_required': 'Basic internet literacy for entry-level tasks. Reading comprehension, attention to detail, and consistency in following guidelines. Specialized projects may require domain expertise (coding, medicine, law, finance).',
        'acceptance_difficulty': 'Moderate. Registration is open, but passing qualification tests for specific projects can be challenging. Many users report spending hours studying for tests only to not be selected.',
        'consistent_work_difficulty': 'High. Work availability is inconsistent. Projects appear and disappear without warning. Contributors may wait weeks for new project assignments. This is the single most common complaint.',
        'rejection_reasons': 'Failing qualification assessments, inconsistent work quality, using AI tools to complete tasks, sharing account information, VPN/Proxy use (strictly forbidden and actively detected), inactive accounts.',
        'loss_access_reasons': 'Quality score drops below threshold, project ends abruptly, account flagged for suspicious activity, inactivity for extended periods, policy violations.',
        'reputation': 'Mixed to negative currently (2024-2026). Trustpilot: 2.0/5. Reddit: widespread frustration about lack of communication, project scarcity, and unpaid qualification time. Historically strong reputation has deteriorated. Zikoko (Nigerian publication) still lists it as a viable option.',
        'risks': 'High project instability. Unpaid qualification time (sometimes hours of unpaid testing). Account deactivation without explanation. Low pay rates for basic tasks. Communication from support is frequently described as nonexistent.',
        'recommended': 'Yes, but with caveats. It is legitimate and pays, but manage expectations. Do not rely on CrowdGen as your primary income source. Use it as one of multiple platforms.',
        'score': 6,
    },
    {
        'name': 'Outlier',
        'website': 'outlier.ai',
        'overview': 'Outlier (formerly Outlier AI) is a platform focused on training advanced AI models through expert-written responses, model evaluation, and reinforcement learning from human feedback (RLHF). It has gained significant attention as one of the higher-paying AI training platforms, with tasks that require writing, coding, math, and domain expertise. The platform is backed by substantial venture capital and works with leading AI companies.',
        'legitimate': 'Yes. Outlier is a legitimate company that has been reviewed by major outlets and has a functional application process. Indeed reviews (2.4/5, 775 reviews) and Glassdoor reviews (3.2/5) confirm real work and real payments. Multiple Reddit communities discuss the platform extensively.',
        'consistent_payments': 'Yes. Multiple independent sources confirm that Outlier pays contributors. Pay rates are generally higher than competitors ($15-$40/hour for most roles). Payment disputes exist but are less common than on CrowdGen.',
        'nigeria_available': 'Uncertain with significant concerns. Outlier has geographic restrictions that have tightened over time. Some Nigerian users have reported being able to register, while others report being blocked or not seeing available projects. The platform prioritizes contributors in the US, UK, Canada, and select other countries. Nigeria is not on the confirmed supported list as of 2025-2026.',
        'country_restrictions': 'Significant. Outlier restricts based on geographic location and uses detection mechanisms. Many African countries, including Nigeria, may face limited or no project availability. VPN use is strictly prohibited and results in immediate banning.',
        'registration': 'Apply at outlier.ai. Sign up with email or Google account. Select areas of expertise (writing, coding, math, sciences, etc.). Complete an assessment/test in chosen domain.',
        'id_verification': 'ID verification is part of the onboarding process. Specific requirements may vary by country. Nigerian applicants may face additional verification hurdles.',
        'payment_methods': 'Primarily via PayPal. Bank transfers (via Stripe in some regions). Payment method availability for Nigeria is not clearly documented on their official site.',
        'payment_schedule': 'Weekly or biweekly payments, depending on the project tier. Higher-tier contributors report more frequent payment cycles.',
        'earnings_beginner': '$15-$20/hour for writing and general tasks (for those in supported regions). Rates may be lower for contributors in Africa/Nigeria based on regional adjustments.',
        'earnings_experienced': '$20-$40/hour for coding, math, and specialized domains. Top-tier experts in rare fields can earn $40-$60/hour.',
        'task_types': 'Writing AI training responses, evaluating AI model outputs, correcting AI-generated text, coding task completion, math problem solving, fact-checking, prompt engineering, reinforcement learning tasks.',
        'skills_required': 'Strong writing skills for text tasks. Programming knowledge for coding tasks. Math proficiency for quantitative tasks. Domain expertise is highly valued. General reasoning and critical thinking are essential.',
        'acceptance_difficulty': 'High. Outlier has a multi-step application process that includes domain-specific assessments. Many applicants report failing the initial assessment. The platform is selective, especially for higher-paying coding and math roles.',
        'consistent_work_difficulty': 'Moderate to high. Project availability fluctuates. Some contributors report months of steady work followed by sudden project pauses. The RLHF space is volatile and dependent on AI company contracts.',
        'rejection_reasons': 'Failing domain assessments, poor writing quality, detected AI use in application (they test for this), geographic restrictions, inconsistent availability, VPN use.',
        'loss_access_reasons': 'Quality scores dropping below threshold, project cancellation, using AI tools to complete tasks (strictly forbidden), account sharing, communication issues.',
        'reputation': 'Mixed. Indeed: 2.4/5 (complaints about unpaid training and poor communication). Glassdoor: 3.2/5 (better, noting good pay but project instability). Reddit communities are active with both positive and negative experiences. Pay quality is generally praised; management communication is criticized.',
        'risks': 'Nigeria availability is uncertain and may be restricted. Unpaid training periods. Projects can end abruptly. Quality enforcement is strict. AI-generated work detection is sophisticated. Regional pay adjustments may reduce earnings for Nigerian contributors.',
        'recommended': 'Apply and test, but do not count on it. If you can access it from Nigeria, it offers good pay. If blocked, move on immediately to other platforms. Do not waste time trying to bypass geographic restrictions.',
        'score': 7,
    },
    {
        'name': 'Handshake AI',
        'website': 'joinhandshake.com',
        'overview': 'Handshake is a career network primarily designed for college students and recent graduates. It connects users with internships, entry-level jobs, and increasingly with AI-related freelance opportunities. The platform is backed by notable investors and has partnerships with over 1,400 colleges and universities. It is NOT a dedicated AI data annotation platform but rather a career marketplace that occasionally features AI training gigs.',
        'legitimate': 'Yes. Handshake is a legitimate company with Y Combinator roots, significant venture funding, and a large user base in the university ecosystem. Trustpilot reviews are generally positive for its core job-matching functionality.',
        'consistent_payments': 'Not applicable in the traditional sense. Handshake does not pay contributors directly. Payments are handled by the employers who post opportunities through the platform. Payment reliability depends entirely on the specific employer.',
        'nigeria_available': 'Partially. Handshake is primarily designed for the US college market. International students at US universities can use it, but direct access for Nigerian residents without US university affiliation is limited. Some opportunities may be remote and accessible, but the platform is not optimized for the Nigerian market.',
        'country_restrictions': 'Yes. Most opportunities are US-centric. Remote AI training roles posted on Handshake may accept international applicants, but this is at the employer\'s discretion.',
        'registration': 'Sign up with a .edu email address for full access. Non-student accounts have limited functionality. Profile includes education, skills, work experience, and career interests.',
        'id_verification': 'Student status verification via university email (.edu). Some employers may require additional verification during their hiring process.',
        'payment_methods': 'Determined by the posting employer (not Handshake). Typically direct deposit, PayPal, or company payroll systems.',
        'payment_schedule': 'Determined by the employer. Varies widely.',
        'earnings_beginner': 'Varies by employer. AI-related gigs range from $12-$25/hour. Many listings do not disclose pay until the interview stage.',
        'earnings_experienced': '$22-$60+/hour for specialized AI training roles (for those who can secure them through the platform).',
        'task_types': 'AI training gigs are a subset of listings. Other opportunities include internships, part-time jobs, and full-time positions across all industries.',
        'skills_required': 'Varies by posting. AI training roles typically require writing, coding, or domain expertise. Being a current student or recent graduate is the main requirement for platform access.',
        'acceptance_difficulty': 'High for Nigerians without US university affiliation. The platform is not designed for the Nigerian market. Competition is intense even for US-based students.',
        'consistent_work_difficulty': 'Very high. AI training gigs appear sporadically. This is not a platform you can rely on for consistent AI annotation work.',
        'rejection_reasons': 'Not being a student or recent graduate, not having a .edu email, being located outside the target market, lacking relevant skills for specific postings.',
        'loss_access_reasons': 'Account deletion is rare. Activity is determined by employer engagement, not platform participation.',
        'reputation': 'Strong for its core purpose (student job matching). Limited relevance for AI data annotation. Not commonly discussed in AI annotation communities.',
        'risks': 'Low risk but low relevance. You are unlikely to lose anything, but you are also unlikely to find consistent AI training work here as a beginner in Nigeria.',
        'recommended': 'No. Handshake is not a viable AI annotation platform for beginners in Nigeria. It is a student job board with occasional AI training listings. Your time is better spent on dedicated platforms.',
        'score': 3,
    },
    {
        'name': 'TELUS Digital',
        'website': 'telusinternational.ai',
        'overview': 'TELUS Digital (formerly TELUS International AI) is the AI division of TELUS Corporation, a major Canadian telecommunications company. The platform offers AI training, search evaluation, and data annotation work to a global contributor base. It is one of the more established platforms alongside Appen, with a large presence in the search quality rating space.',
        'legitimate': 'Yes. TELUS Digital is backed by TELUS Corporation (TSX: T, NYSE: TU), a multi-billion dollar Canadian telecom company. The platform is legitimate, well-funded, and has been operating for years.',
        'consistent_payments': 'Yes, with some issues. Indeed (3.5/5, 3,375 reviews) confirms that TELUS pays contributors, but pay rates are frequently described as low. Trustpilot reviews mention payment delays and customer service issues. Payments do arrive, but the experience is often frustrating.',
        'nigeria_available': 'Yes. TELUS Digital accepts contributors from Nigeria. Nigerian reviewers on Indeed and Reddit confirm participation. The platform has historically been open to contributors across Africa.',
        'country_restrictions': 'Limited. Most geographic restrictions apply at the project level rather than the account level. Some projects require specific language skills or cultural knowledge that may limit Nigerian contributors.',
        'registration': 'Apply at telusinternational.ai. Create an account, complete assessments, and wait for project matching. The onboarding process can be lengthy (weeks to months).',
        'id_verification': 'ID verification required. Government-issued ID, address proof, and tax documentation. Verification process can be slow.',
        'payment_methods': 'PayPal and Payoneer for international contributors including Nigeria. Some contributors report bank transfer availability.',
        'payment_schedule': 'Monthly payments are standard. Some projects pay biweekly. Payment processing can take additional time for international contributors.',
        'earnings_beginner': '$3-$8/hour for search evaluation and basic rating tasks. This is consistent with the primary complaint that TELUS pay rates are low compared to newer platforms.',
        'earnings_experienced': '$10-$20/hour for specialized AI training and domain-specific projects. The AI Community board lists expert projects at $20+/hour.',
        'task_types': 'Search engine result evaluation, map rating, voice data collection, AI model training, image annotation, text classification, data quality assessment.',
        'skills_required': 'Strong internet research skills for search evaluation. Attention to detail and ability to follow complex guidelines. English proficiency. Some projects require specific language skills (Hausa, Yoruba, Igbo may be valuable).',
        'acceptance_difficulty': 'Moderate. Getting accepted is possible but the process is slow. Assessments can be challenging and require significant preparation. The waiting period for project assignment can be weeks.',
        'consistent_work_difficulty': 'High. Like CrowdGen, work availability is inconsistent. Tasks fluctuate significantly. The constant fluctuation of task availability is cited as the most frustrating aspect.',
        'rejection_reasons': 'Failing assessments, poor performance on tasks, not meeting minimum activity requirements, geographic restrictions on specific projects.',
        'loss_access_reasons': 'Low quality scores, inactivity, project ending, guideline violations, account dormancy.',
        'reputation': 'Mixed. Indeed: 3.5/5 (decent but complaints about low pay). Trustpilot: negative (payment and communication issues). YouTube reviewers note it is "legit but low pay." Reliable but unimpressive for earnings.',
        'risks': 'Low risk in terms of legitimacy but high risk in terms of time investment vs. return. Lengthy onboarding for low pay. Work inconsistency is a chronic issue. Better suited as a supplementary income source.',
        'recommended': 'Yes, as a secondary platform. Worth registering for, especially if you speak a Nigerian language that may be valuable for localization projects. Keep expectations modest and use alongside other platforms.',
        'score': 6,
    },
    {
        'name': 'Welocalize',
        'website': 'welocalize.com / welodata.ai',
        'overview': 'Welocalize is a major localization and translation company that has expanded into AI data services through its Welo Data community. The company is ranked #9 on the Nimdzi Insights Top 100 list of the largest language service providers globally. It supports over 300 languages and combines AI with human expertise to serve enterprise clients. The contributor community (Welo Data) includes over 500,000 vetted experts worldwide.',
        'legitimate': 'Yes. Welocalize is a well-established, legitimate company with a strong reputation in the localization industry. Indeed reviews (367 reviews) confirm real work and payments. The company has been operating since 1997 and serves major enterprise clients.',
        'consistent_payments': 'Generally yes, but work availability has declined. Long-term contributors report that work volume has decreased significantly since early 2025. When work is available, payments are reliable. The concern is less about payment reliability and more about having enough work to earn meaningfully.',
        'nigeria_available': 'Yes. Welocalize/Welo Data accepts contributors from Nigeria, particularly for translation, localization, and language-related AI tasks. Nigerian contributors with strong English and local language skills (Hausa, Yoruba, Igbo) may find relevant opportunities.',
        'country_restrictions': 'Minimal at the account level. Project availability varies by region and language. Contributors with rare language skills are in higher demand regardless of location.',
        'registration': 'Apply through welodata.ai/join-the-community or the Welocalize careers page. Create multiple accounts (some contributors report needing accounts on multiple sub-platforms). Application includes skills assessment and language proficiency tests.',
        'id_verification': 'Standard ID verification. The Welocalize onboarding process requires multiple account setups which some users report as confusing.',
        'payment_methods': 'PayPal is the standard method for international contributors. Bank transfers may be available for some projects.',
        'payment_schedule': 'Typically monthly. Payment schedules vary by project.',
        'earnings_beginner': '$5-$12/hour for general translation and localization tasks. AI data tasks may pay more.',
        'earnings_experienced': '$15-$30/hour for specialized language tasks, senior localization roles, and high-demand language pairs. Rare languages command premium rates.',
        'task_types': 'Translation, localization, AI-generated text evaluation, language quality evaluation, data collection in local languages, cultural relevance assessment, AI model training with language data.',
        'skills_required': 'Strong bilingual or multilingual skills (English + at least one Nigerian language is valuable). Cultural knowledge. Attention to linguistic detail. Some projects require technical or domain-specific knowledge.',
        'acceptance_difficulty': 'Moderate. Getting accepted requires passing language proficiency tests. The multi-account setup is confusing but not difficult. Contributors with strong language skills are in demand.',
        'consistent_work_difficulty': 'High. Work volume has decreased significantly. Some contributors report that the job is "no longer sustainable" due to low work availability. This trend appears to be ongoing.',
        'rejection_reasons': 'Failing language proficiency tests, insufficient language skills, poor performance on projects, not maintaining activity requirements.',
        'loss_access_reasons': 'Project ending, quality issues, inactivity, account issues related to their complex multi-platform system.',
        'reputation': 'Mixed. Positive for legitimacy and professionalism. Negative for declining work availability and confusing account management. Staff responsiveness has reportedly decreased.',
        'risks': 'Declining work volume is the primary risk. Multi-platform account management is confusing. Support responsiveness has decreased. Work may not be consistent enough to rely on.',
        'recommended': 'Yes, especially if you have strong multilingual skills. Nigerian contributors who speak local languages in addition to English have an advantage. Register and maintain your account, but do not depend on it as your primary platform.',
        'score': 6,
    },
    {
        'name': 'Alignerr',
        'website': 'alignerr.com',
        'overview': 'Alignerr is a relatively new AI training platform powered by Labelbox, a well-established AI data labeling company. Alignerr focuses on connecting domain experts with AI training tasks across writing, coding, accounting, audio, STEM, and general evaluation roles. The platform has gained rapid traction with a 4.1/5 Trustpilot rating from over 2,400 reviews, making it one of the highest-rated platforms in this space.',
        'legitimate': 'Yes. Alignerr is backed by Labelbox, which has raised over $100M in venture capital. The platform has a strong Trustpilot rating (4.1/5, 2,447 reviews) and positive Glassdoor reviews. Contributors report real work and real payments. The AI interview process (with "Zara") is innovative and the application process is described as "straightforward."',
        'consistent_payments': 'Yes, based on current evidence. Trustpilot reviews are overwhelmingly positive about payment reliability. The platform is newer, so long-term track record is limited, but current signals are strong.',
        'nigeria_available': 'Likely yes, but not explicitly confirmed. Alignerr operates as a remote-first platform and has not published a restricted countries list. The platform model suggests global accessibility. However, specific Nigeria availability data is limited. Apply and test is the recommended approach.',
        'country_restrictions': 'Not clearly documented. The platform appears to operate with minimal geographic restrictions, but this may change as they scale.',
        'registration': 'Sign up at alignerr.com. Complete a profile with expertise areas. Go through an AI-guided interview process ("Zara"). Assessment tests in chosen domains.',
        'id_verification': 'Standard verification process. The AI interview serves as an initial screening. Additional ID verification is likely required before first payment.',
        'payment_methods': 'Not clearly documented for Nigeria specifically. Likely PayPal or bank transfer based on industry standards.',
        'payment_schedule': 'Not explicitly stated. Based on contributor reviews, appears to be regular and timely.',
        'earnings_beginner': 'Claimed $15-$25/hour for general tasks. Actual rates for beginners in Africa may vary. The platform advertises up to $150/hour for specialized roles, which is likely reserved for experts in wealthy markets.',
        'earnings_experienced': '$40-$150/hour for specialized domain experts (accounting, coding, audio, STEM). These premium rates are likely limited to contributors with rare, high-demand expertise.',
        'task_types': 'AI response evaluation and correction, domain-specific data quality analysis, AI model alignment tasks, coding task review, audio evaluation, general STEM tasks.',
        'skills_required': 'Domain expertise is valued. Writing ability, coding skills, accounting knowledge, or STEM backgrounds. The platform matches contributors to projects based on their stated expertise.',
        'acceptance_difficulty': 'Moderate. The AI-guided interview is a novel approach that may be easier or harder depending on the applicant. Trustpilot reviews suggest the process is "clear, modern, and well-organized."',
        'consistent_work_difficulty': 'Uncertain. The platform is relatively new and long-term work consistency data is limited. Current reviews suggest work is available, but sustainability is unproven.',
        'rejection_reasons': 'Failing domain assessments, poor interview performance, insufficient expertise in claimed areas, geographic restrictions (if any).',
        'loss_access_reasons': 'Insufficient data due to platform age. Likely similar to other platforms: quality issues, inactivity, project changes.',
        'reputation': 'Strong. Trustpilot: 4.1/5 (2,447 reviews) - the highest among all platforms reviewed. Glassdoor: 3.0/5. Reddit: positive initial experiences. The platform is frequently praised for its user experience and modern application process.',
        'risks': 'New platform with limited long-term track record. Work consistency is unproven over extended periods. Premium rates ($150/hour) are likely not accessible to beginners. Nigeria availability is not explicitly confirmed.',
        'recommended': 'Yes, worth applying. High Trustpilot rating is encouraging. The platform is modern and well-designed. Register and test Nigeria availability while maintaining other platform accounts.',
        'score': 7,
    },
    {
        'name': 'OneForma',
        'website': 'oneforma.com',
        'overview': 'OneForma is a global AI enablement platform operated by Centific (formerly Pactera EDGE). It has over 1.8 million users in 230+ global markets and offers a wide range of tasks including data annotation, AI training, transcription, translation, and linguistic evaluation. It is one of the largest crowdsourcing platforms by user count, though this volume does not necessarily translate to quality opportunities.',
        'legitimate': 'Yes. OneForma is operated by Centific, a legitimate technology company. The platform has been operating for years and has processed payments to contributors globally. However, the contributor experience is widely criticized.',
        'consistent_payments': 'Yes, but at very low rates. OneForma pays contributors, but the pay is frequently described as insultingly low. Reddit: "$4.50 an hour is not an insult, it is a typo." Some tasks pay as low as $2-$4/hour, which is below minimum wage in most countries.',
        'nigeria_available': 'Yes. OneForma explicitly operates in Nigeria. It is listed in Nigerian-focused guides (Zikoko, AfrikStories) as a platform Nigerians can join. The large market coverage (230+ countries) includes Nigeria.',
        'country_restrictions': 'Minimal at the account level. Project-specific restrictions apply based on language and expertise requirements.',
        'registration': 'Sign up at oneforma.com with email. Complete profile with language skills. Pass qualification tests for specific projects.',
        'id_verification': 'Standard ID verification. Additional verification may be required for certain projects.',
        'payment_methods': 'PayPal is available for Nigerian contributors. Payoneer may also be supported.',
        'payment_schedule': 'Typically monthly. Payment thresholds may apply.',
        'earnings_beginner': '$2-$5/hour for basic tasks. This is among the lowest in the industry and makes the platform difficult to recommend for meaningful income.',
        'earnings_experienced': '$8-$15/hour for specialized tasks (translation, linguistic evaluation). Even experienced contributors report low pay relative to other platforms.',
        'task_types': 'Data annotation, AI training, transcription, translation, linguistic evaluation, data collection, AI-generated text evaluation.',
        'skills_required': 'Basic internet literacy for entry tasks. Language skills for translation roles. Attention to detail for annotation tasks. Technical skills are not typically required.',
        'acceptance_difficulty': 'Low. OneForma has a high acceptance rate for basic accounts. Getting into specific projects requires passing qualification tests, which vary in difficulty.',
        'consistent_work_difficulty': 'High. Reddit users report "there is no work actually available." Tests are described as a "waste of time." Project availability is inconsistent.',
        'rejection_reasons': 'Failing qualification tests, inconsistent quality, inactivity, using unauthorized tools.',
        'loss_access_reasons': 'Project ending, poor quality scores, inactivity, account policy violations.',
        'reputation': 'Poor. Reddit: "Do not waste your time." Trustpilot: mixed to negative. Widespread complaints about low pay and no available work. The high user count (1.8M+) appears to create intense competition for limited tasks.',
        'risks': 'Low pay is the primary risk. Time spent on qualification tests may not lead to actual work. High competition among 1.8M users reduces individual opportunity. The platform may not be worth the time investment relative to alternatives.',
        'recommended': 'No, not as a primary or even secondary platform. The pay is too low and work too scarce to justify the time investment. If you register, do so only for potential access to rare language-specific projects. Do not spend significant time on this platform.',
        'score': 3,
    },
    {
        'name': 'Prolific',
        'website': 'prolific.com',
        'overview': 'Prolific is a research participation platform designed primarily for academic and AI research studies. It connects researchers with participants for surveys, studies, and data collection tasks. Unlike dedicated AI annotation platforms, Prolific focuses on providing high-quality human data for scientific and AI research. The platform is Y Combinator-backed and serves over 35,000 AI developers and researchers.',
        'legitimate': 'Yes. Prolific is highly legitimate. Y Combinator-backed, based in London with offices in NYC and SF. Trustpilot reviews praise fair compensation, prompt payments, and user-friendly experience. The platform is designed for academic rigor and research integrity.',
        'consistent_payments': 'Yes. Prolific is known for reliable, prompt payments. The platform recommends researchers pay at minimum $12/hour (or 9 GBP/hour), which is higher than most survey platforms. Participants report consistent payment reliability.',
        'nigeria_available': 'Likely yes. Prolific operates internationally and has been accessible to participants in Nigeria. However, availability depends on researcher demand for Nigerian participants. Some studies may geo-restrict to specific countries.',
        'country_restrictions': 'Minimal at the account level. Study-specific restrictions depend on researcher requirements. Nigerian participants may see fewer studies than those in the US or UK.',
        'registration': 'Sign up at prolific.com as a participant. Complete demographic profile. Wait for study invitations based on your profile match.',
        'id_verification': 'Basic profile verification. Some studies may require additional screening or verification.',
        'payment_methods': 'PayPal and direct bank transfer (Prolific handles payouts, not individual researchers).',
        'payment_schedule': 'Payments are processed after study completion. Typically within days. Minimum cashout threshold is relatively low ($5).',
        'earnings_beginner': '$8-$15/hour based on study availability. The recommended minimum pay ensures a baseline quality. Actual earnings depend on study frequency and duration.',
        'earnings_experienced': '$12-$25/hour for longer, more specialized studies. Consistent high earnings require frequent study availability.',
        'task_types': 'Research surveys, behavioral studies, AI model evaluation studies, usability testing, cognitive tasks, language studies, opinion surveys. Tasks are study-based, not ongoing annotation work.',
        'skills_required': 'No specialized skills required for basic participation. Some studies target specific demographics or expertise. Consistent engagement and honest responses are valued.',
        'acceptance_difficulty': 'Low. Registration is straightforward. Getting consistent studies depends on demographic match with researcher needs.',
        'consistent_work_difficulty': 'High. Studies appear based on researcher demand, not platform supply. Work availability is unpredictable. Some weeks may have many studies, others very few. This is not a full-time income platform.',
        'rejection_reasons': 'Few rejections at the platform level. Individual studies may reject participants who do not meet screening criteria or fail attention checks.',
        'loss_access_reasons': 'Account suspension for dishonest responses, failing attention checks, or policy violations. Otherwise, accounts remain active.',
        'reputation': 'Strong. Known for fair pay, reliable payments, and user-friendly design. Considered one of the most ethical research participation platforms. Trustpilot reviews are consistently positive.',
        'risks': 'Low risk. The main concern is unpredictable study availability. Income is supplemental rather than primary. Not a dedicated AI annotation platform.',
        'recommended': 'Yes, as a supplementary income source. Worth registering for its reliable payments and ethical approach. Do not rely on it for consistent AI annotation work, as it is primarily a research study platform.',
        'score': 6,
    },
    {
        'name': 'Mecor (Mercor)',
        'website': 'mercor.com / work.mercor.com',
        'overview': 'Mercor (frequently referred to as "Mecor" by users, though the company name is Mercor) is an AI training platform focused on organizing human intelligence to power the AI economy. It specializes in RLHF data, frontier model training, and AI agent training at scale for top AI companies. The platform has gained significant traction on Reddit and remote work communities.',
        'legitimate': 'Yes. Mercor is a legitimate company with significant venture backing. Trustpilot reviews are positive ("Mercor has been life changing"). LinkedIn presence confirms real operations. The company works with leading AI labs.',
        'consistent_payments': 'Yes. Trustpilot reviews praise payment reliability. Contributors describe the platform as paying "industrial standard" rates. Multiple independent sources confirm payment reliability.',
        'nigeria_available': 'Uncertain. Mercor has not published a clear list of supported countries. Some contributors outside the US report access, while others face restrictions. Nigeria availability cannot be confirmed from official sources. Community reports are mixed.',
        'country_restrictions': 'Likely significant, similar to Outlier. Mercor works with frontier AI labs that often restrict contributor pools to specific regions. VPN use is prohibited and detected.',
        'registration': 'Sign up at work.mercor.com. Create a profile. Browse and apply for listed roles. Some roles require passing assessments.',
        'id_verification': 'Standard verification. Specific requirements may vary by role and region.',
        'payment_methods': 'Likely PayPal or direct bank transfer. Payment methods for Nigeria specifically are not documented.',
        'payment_schedule': 'Not explicitly documented. Appears to be regular based on contributor reviews.',
        'earnings_beginner': 'Listed range starts at $10-$15/hour for entry-level roles. Actual rates for Nigerian contributors are unknown.',
        'earnings_experienced': '$20-$40+/hour for specialized roles (coding, AI training, domain expertise). Premium rates for rare skills.',
        'task_types': 'RLHF data generation, AI agent training, frontier model evaluation, coding tasks, domain-specific AI training, data validation.',
        'skills_required': 'Strong writing or coding skills. Domain expertise is valued. AI/ML knowledge is helpful. Critical thinking and attention to detail.',
        'acceptance_difficulty': 'Moderate to high. Mercor appears selective about its contributor pool. Assessment difficulty varies by role.',
        'consistent_work_difficulty': 'Uncertain. Platform is newer to the mass market. Current reports suggest work is available for accepted contributors.',
        'rejection_reasons': 'Failing assessments, geographic restrictions, insufficient expertise, not meeting role-specific requirements.',
        'loss_access_reasons': 'Quality issues, project ending, policy violations, geographic restrictions changes.',
        'reputation': 'Positive but limited data. Trustpilot: positive reviews. Reddit: frequently mentioned as a platform to watch. Limited long-term community data.',
        'risks': 'Nigeria availability is unconfirmed. Platform is newer with less track record. Geographic restrictions may apply. Premium rates may not be accessible to beginners or contributors in Africa.',
        'recommended': 'Apply and test availability. If accessible from Nigeria, it has strong potential. If blocked, move on quickly. Worth a registration attempt but do not invest significant time without confirming availability.',
        'score': 6,
    },
]

# ─── COVER HTML ───────────────────────────────────────────────────────
COVER_HTML = '''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:794px; height:1123px; background:#2f454f; font-family:'Inter',sans-serif; overflow:hidden; }
.layer0 { position:absolute; inset:0; z-index:0; background:#2f454f; }
.layer1 { position:absolute; inset:0; z-index:1; overflow:hidden; }
.layer2 { position:absolute; inset:0; z-index:2; }
.layer3 { position:absolute; inset:0; z-index:3; padding:60px 60px; display:flex; flex-direction:column; justify-content:center; }

.accent-block { position:absolute; top:0; right:0; width:340px; height:1123px; background:#53656e; }
.accent-line { position:absolute; top:0; left:340px; width:3px; height:1123px; background:#1f6c92; }

.kicker { font-size:13px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.6); margin-bottom:20px; }
.title { font-size:42px; font-weight:900; color:#ffffff; line-height:1.15; margin-bottom:20px; max-width:380px; }
.summary { font-size:15px; font-weight:400; color:rgba(255,255,255,0.85); line-height:1.6; max-width:380px; margin-bottom:30px; }
.meta { font-size:13px; font-weight:400; color:rgba(255,255,255,0.5); line-height:1.5; }
.meta span { color:rgba(255,255,255,0.7); }

.tag { display:inline-block; background:#1f6c92; color:white; font-size:11px; font-weight:600; padding:4px 12px; border-radius:3px; margin-right:6px; margin-bottom:6px; }
</style>
</head>
<body>
<div class="layer0"></div>
<div class="layer1">
  <div class="accent-block"></div>
  <div class="accent-line"></div>
</div>
<div class="layer2"></div>
<div class="layer3">
  <div class="kicker">Comprehensive Evidence-Based Review</div>
  <div class="title">AI Data Annotation Platforms<br>for Nigeria</div>
  <div class="summary">A beginner-friendly analysis of 9 AI training and data annotation platforms. Covers legitimacy, Nigeria availability, payment methods, earnings potential, risks, and a practical 90-day roadmap to earning remotely.</div>
  <div class="meta">
    <span>9 Platforms Reviewed</span> &middot; 20 Data Points Each &middot; 5 Ranking Categories<br>
    July 2026 &middot; Research Edition
  </div>
  <div style="margin-top:20px;">
    <span class="tag">CrowdGen</span>
    <span class="tag">Outlier</span>
    <span class="tag">TELUS Digital</span>
    <span class="tag">Welocalize</span>
    <span class="tag">Alignerr</span>
    <span class="tag">OneForma</span>
    <span class="tag">Prolific</span>
    <span class="tag">Mercor</span>
    <span class="tag">Handshake</span>
  </div>
</div>
</body>
</html>'''


# ─── HELPER: Build platform detail section ───────────────────────────
def build_platform_section(p, idx):
    """Build a full platform analysis section."""
    elements = []

    # Section header
    elements.append(Paragraph(f'{idx}. {B(p["name"])}', h1_style))
    elements.append(Paragraph(f'Website: {I(p["website"])}', meta_style))
    elements.append(sp(12))

    # 20 data points as structured Q&A
    fields = [
        ('Company Overview', p['overview']),
        ('Is It Legitimate?', p['legitimate']),
        ('Has It Consistently Paid Contributors?', p['consistent_payments']),
        ('Does It Accept Applicants from Nigeria?', p['nigeria_available']),
        ('Country Restrictions', p['country_restrictions']),
        ('Registration Requirements', p['registration']),
        ('Identity Verification Process', p['id_verification']),
        ('Payment Methods for Nigerians', p['payment_methods']),
        ('Payment Schedule', p['payment_schedule']),
        ('Average Hourly Earnings (Beginner)', p['earnings_beginner']),
        ('Average Hourly Earnings (Experienced)', p['earnings_experienced']),
        ('Types of Available Tasks', p['task_types']),
        ('Skills Required', p['skills_required']),
        ('Difficulty of Getting Accepted', p['acceptance_difficulty']),
        ('Difficulty of Getting Consistent Work', p['consistent_work_difficulty']),
        ('Common Rejection Reasons', p['rejection_reasons']),
        ('Common Reasons for Losing Access', p['loss_access_reasons']),
        ('Current Reputation', p['reputation']),
        ('Risks and Red Flags', p['risks']),
        ('Recommended for Beginners in Nigeria?', p['recommended']),
    ]

    for label, value in fields:
        elements.append(Paragraph(f'{B(label)}', h3_style))
        elements.append(Paragraph(value, body_style))
        elements.append(sp(4))

    # Score display
    score_val = p['score']
    if score_val >= 7:
        verdict_style = verdict_good
        verdict_text = 'STRONGLY RECOMMENDED'
    elif score_val >= 6:
        verdict_style = verdict_warn
        verdict_text = 'RECOMMENDED WITH CAVEATS'
    elif score_val >= 5:
        verdict_style = verdict_warn
        verdict_text = 'CONDITIONALLY RECOMMENDED'
    else:
        verdict_style = verdict_bad
        verdict_text = 'NOT RECOMMENDED'

    score_data = [[Paragraph(f'<b>Overall Score: {score_val}/10</b>', score_style),
                   Paragraph(f'{B(verdict_text)}', verdict_style)]]
    score_table = Table(score_data, colWidths=[200, 280])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), CARD_BG),
        ('BACKGROUND', (1, 0), (1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(sp(12))
    elements.append(score_table)
    elements.append(sp(18))

    return elements


# ─── MAIN BUILD ───────────────────────────────────────────────────────
def build_pdf():
    story = []

    # ── TITLE PAGE (inline, minimal) ──
    story.append(sp(120))
    story.append(Paragraph('AI Data Annotation Platforms<br/>for Nigeria', title_style))
    story.append(sp(12))
    story.append(Paragraph('Comprehensive Evidence-Based Review for Beginners', subtitle_style))
    story.append(sp(6))
    story.append(Paragraph('9 Platforms &middot; 20 Data Points Each &middot; 5 Ranking Categories &middot; 90-Day Roadmap', meta_style))
    story.append(sp(30))
    story.append(HRFlowable(width='60%', thickness=1, color=ACCENT, spaceAfter=20))
    story.append(Paragraph('Research Edition &middot; July 2026', meta_style))
    story.append(sp(24))
    story.append(Paragraph('Sources: Official platforms, Trustpilot, Indeed, Glassdoor, Reddit, Zikoko, AfrikStories, RemoWork, YouTube reviews, and independent publications.', small_style))
    story.append(PageBreak())

    # ── TABLE OF CONTENTS (simple) ──
    story.append(Paragraph('Table of Contents', h1_style))
    story.append(sp(12))
    toc_items = [
        '1. Platform-by-Platform Analysis (9 platforms, 20 data points each)',
        '2. Master Comparison Table',
        '3. Rankings by Category',
        '4. 90-Day Nigeria Roadmap',
        '5. Final Recommendations',
        '6. Source Log',
    ]
    for item in toc_items:
        story.append(Paragraph(item, body_left))
    story.append(PageBreak())

    # ── SECTION 1: Platform-by-Platform Analysis ──
    story.append(Paragraph('1. Platform-by-Platform Analysis', h1_style))
    story.append(Paragraph('Each platform below is evaluated against 20 specific criteria. Data is drawn from official documentation, independent review sites, user communities, and Nigerian-focused publications. Claims are labeled as verified, community-reported, or uncertain.', body_style))
    story.append(sp(12))

    for i, p in enumerate(PLATFORMS, 1):
        section_elements = build_platform_section(p, i)
        story.extend(section_elements)

    # ── SECTION 2: Master Comparison Table ──
    story.append(Paragraph('2. Master Comparison Table', h1_style))
    story.append(Paragraph('This table consolidates key metrics across all 9 platforms for quick comparison. Scores reflect the 20-point analysis above.', body_style))
    story.append(sp(12))

    # Comparison table
    comp_headers = ['Platform', 'Legitimate', 'Nigeria', 'Pay (Beginner)', 'Pay (Experienced)', 'Score']
    comp_data = [comp_headers]
    for p in PLATFORMS:
        score = p['score']
        comp_data.append([
            p['name'].split('(')[0].strip()[:16],
            'Yes' if 'Yes' in p['legitimate'][:5] else 'No',
            p['nigeria_available'].split('.')[0][:20],
            p['earnings_beginner'].split('.')[0][:20],
            p['earnings_experienced'].split('.')[0][:20],
            f'{score}/10'
        ])

    comp_table = Table(comp_data, colWidths=[80, 52, 85, 90, 95, 45])
    comp_table.setStyle(make_table_style(len(comp_data)))
    story.append(comp_table)
    story.append(sp(18))

    # ── SECTION 3: Rankings ──
    story.append(Paragraph('3. Rankings by Category', h1_style))
    story.append(Paragraph('Five separate ranking categories designed for different priorities. Each ranking considers the specific context of a beginner in Nigeria.', body_style))
    story.append(sp(12))

    rankings = [
        {
            'title': '3.1 Easiest to Join',
            'desc': 'Ranked by registration simplicity, assessment difficulty, and onboarding speed for Nigerian applicants.',
            'rankings': [
                ('Prolific', 'Simple sign-up, no assessments, immediate study access.'),
                ('OneForma', 'Open registration, easy profile creation. (But low pay.)'),
                ('CrowdGen (Appen)', 'Open registration, qualification tests needed for projects.'),
                ('Welocalize / Welo Data', 'Registration open, language tests required.'),
                ('TELUS Digital', 'Open registration but lengthy onboarding.'),
                ('Alignerr', 'Modern process but assessment required.'),
                ('Mecor / Mercor', 'Apply for specific roles, assessment varies.'),
                ('Outlier', 'Multi-step assessment, geographically restrictive.'),
                ('Handshake AI', 'Requires .edu email, not designed for Nigeria.'),
            ]
        },
        {
            'title': '3.2 Best Chance of Consistent Work',
            'desc': 'Ranked by historical work availability and current contributor reports of steady task volume.',
            'rankings': [
                ('CrowdGen (Appen)', 'Largest project pool, but inconsistent. Most tasks for Nigerian contributors.'),
                ('TELUS Digital', 'Steady low-pay work available, especially for search evaluation.'),
                ('Welocalize', 'Work declining but still available, especially for multilingual contributors.'),
                ('Prolific', 'Steady for research studies, not for AI annotation specifically.'),
                ('Alignerr', 'New platform, work availability uncertain but promising.'),
                ('Mecor / Mercor', 'Limited data. Work available if accepted.'),
                ('Outlier', 'Good if accepted from Nigeria, uncertain availability.'),
                ('OneForma', 'Low work volume despite high user count.'),
                ('Handshake AI', 'Not a dedicated AI platform, sporadic listings.'),
            ]
        },
        {
            'title': '3.3 Best Pay for Beginners',
            'desc': 'Ranked by actual hourly earnings achievable by a Nigerian beginner with no specialized skills.',
            'rankings': [
                ('Outlier', '$15-$20/hr if accessible from Nigeria. Best pay potential.'),
                ('Alignerr', '$15-$25/hr advertised. Rates for Nigerians uncertain.'),
                ('Mercor', '$10-$15/hr listed. Nigeria rates unconfirmed.'),
                ('Prolific', '$8-$15/hr minimum enforced. Reliable but study-dependent.'),
                ('CrowdGen (Appen)', '$3-$8/hr for beginners. Low but accessible.'),
                ('Welocalize', '$5-$12/hr. Better with language skills.'),
                ('TELUS Digital', '$3-$8/hr. Among the lowest in the industry.'),
                ('OneForma', '$2-$5/hr. Not viable for meaningful income.'),
                ('Handshake AI', 'Varies. Not a reliable income source for Nigerians.'),
            ]
        },
        {
            'title': '3.4 Best Long-Term Sustainability',
            'desc': 'Ranked by the platform\'s ability to provide income over months and years, considering industry trends and company stability.',
            'rankings': [
                ('CrowdGen (Appen)', 'Public company, 28-year track record. Most likely to survive long-term.'),
                ('TELUS Digital', 'Backed by TELUS Corporation (multi-billion dollar). Stable parent.'),
                ('Welocalize', 'Established since 1997, ranked in global LSP top 10. Solid foundation.'),
                ('Outlier', 'VC-backed, growing fast but dependent on AI lab contracts.'),
                ('Alignerr', 'Backed by Labelbox ($100M+ raised). New but well-funded.'),
                ('Mercor', 'VC-backed, growing. Newer, long-term survival uncertain.'),
                ('Prolific', 'Y Combinator-backed, well-positioned for research market.'),
                ('OneForma', '1.8M users but poor reputation and low pay. Declining quality.'),
                ('Handshake AI', 'Student job board, not a sustainable AI annotation platform.'),
            ]
        },
        {
            'title': '3.5 Lowest Risk',
            'desc': 'Ranked by the combined risk of scams, account bans, payment failures, wasted time, and platform collapse.',
            'rankings': [
                ('Prolific', 'Low risk. Reliable payments, no reported scams, ethical platform.'),
                ('CrowdGen (Appen)', 'Public company, legitimate. Risk is low pay, not scams.'),
                ('TELUS Digital', 'Backed by TELUS Corp. Risk is low pay and inconsistency.'),
                ('Welocalize', 'Legitimate company. Risk is declining work volume.'),
                ('Alignerr', 'Well-backed, strong reviews. Risk is newness and unproven track record.'),
                ('Mercor', 'Legitimate. Risk is Nigeria availability uncertainty.'),
                ('Outlier', 'Legitimate but risky for Nigerians due to geographic restrictions.'),
                ('OneForma', 'Legitimate but high risk of wasted time due to low pay and no work.'),
                ('Handshake AI', 'Low personal risk but high opportunity risk (wrong platform).'),
            ]
        },
    ]

    for ranking in rankings:
        story.append(Paragraph(ranking['title'], h2_style))
        story.append(Paragraph(ranking['desc'], body_style))
        story.append(sp(8))

        for j, (name, reason) in enumerate(ranking['rankings'], 1):
            rank_data = [[
                Paragraph(f'<b>{j}</b>', ParagraphStyle('RankNum', fontName='FreeSerif-Bold', fontSize=12, textColor=colors.white, alignment=TA_CENTER)),
                Paragraph(f'<b>{name}</b><br/><font size="8" color="{TEXT_MUTED.hexval()}">{reason}</font>', body_left)
            ]]
            rank_table = Table(rank_data, colWidths=[30, 430])
            row_bg = CARD_BG if j % 2 == 0 else colors.white
            rank_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, 0), HEADER_FILL),
                ('BACKGROUND', (1, 0), (1, 0), row_bg),
                ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(rank_table)
            story.append(sp(3))

        story.append(sp(12))

    # ── SECTION 4: 90-Day Roadmap ──
    story.append(Paragraph('4. 90-Day Nigeria Roadmap', h1_style))
    story.append(Paragraph('A practical, staged action plan for a beginner in Nigeria with no remote work experience. This roadmap is conservative and realistic. Earnings estimates are based on verified contributor reports, not optimistic projections.', body_style))
    story.append(sp(12))

    story.append(Paragraph('Phase 1: Foundation (Days 1-30)', h2_style))
    story.append(Paragraph('The goal of Phase 1 is to set up all necessary infrastructure, create accounts, and begin qualifying for work. Do not expect significant earnings in this phase. Treat it as an investment in future income.', body_style))
    story.append(sp(6))

    story.append(Paragraph('Week 1: Infrastructure Setup', h3_style))
    w1_items = [
        'Create a professional Gmail address (not a nickname or casual email).',
        'Set up a PayPal Nigeria account and complete verification. PayPal is the most widely accepted payment method across all platforms reviewed.',
        'Create a Payoneer account as a backup payment method.',
        'Set up a dedicated workspace with reliable internet connection. Mobile hotspot is acceptable but unstable connections will hurt task completion.',
        'Create a simple CV/resume focusing on language skills, writing ability, attention to detail, and any domain expertise you have.',
        'Take a typing speed test online. Aim for at least 40 WPM. Faster typing directly increases hourly earnings on annotation tasks.',
    ]
    for item in w1_items:
        story.append(bullet(item))
    story.append(sp(8))

    story.append(Paragraph('Week 2: Account Registration', h3_style))
    w2_items = [
        'Register on CrowdGen (crowdgen.com). Complete full profile including all language skills (English, Hausa, Yoruba, Igbo if applicable). Nigerian languages are an asset.',
        'Register on TELUS Digital (telusinternational.ai). Complete profile and begin assessment preparation.',
        'Register on Welocalize / Welo Data (welodata.ai/join-the-community). Highlight multilingual abilities.',
        'Register on Prolific (prolific.com). Complete demographic profile thoroughly (more detail = more study matches).',
        'Register on Alignerr (alignerr.com). Complete the AI-guided interview process.',
        'Register on Mecor/Mercor (work.mercor.com). Test Nigeria availability immediately.',
        'Attempt to register on Outlier (outlier.ai). If geographically blocked, move on. Do not waste time trying to bypass restrictions.',
        'Skip OneForma and Handshake AI. Your time is better invested elsewhere.',
    ]
    for item in w2_items:
        story.append(bullet(item))
    story.append(sp(8))

    story.append(Paragraph('Weeks 3-4: Qualification and First Tasks', h3_style))
    w34_items = [
        'Begin taking qualification tests on CrowdGen. Study guidelines thoroughly before each test. Unpaid test time is an investment.',
        'Complete TELUS Digital assessments. These are typically search evaluation or map rating tests. Practice with online mock tests.',
        'Take language proficiency tests on Welocalize. If you speak a Nigerian language, emphasize this.',
        'Start accepting studies on Prolific to build your track record and earn first small payments.',
        'If Alignerr or Mercor are accessible, begin qualification processes.',
        'Daily time investment: 2-4 hours on platform tasks and qualification, plus 1 hour of skill building.',
        'Keep a log of every test taken, every platform interaction, and every payment received.',
    ]
    for item in w34_items:
        story.append(bullet(item))
    story.append(sp(8))

    story.append(Paragraph(f'{B("Expected Earnings at Day 30: $20-$80 total.")} This assumes you secured at least one active platform and completed basic tasks. If you earned nothing, do not panic. Many contributors report 2-4 weeks of unpaid qualification before first earnings.', verdict_warn))
    story.append(sp(12))

    # Phase 2
    story.append(Paragraph('Phase 2: Building Momentum (Days 31-60)', h2_style))
    story.append(Paragraph('By Phase 2, you should have active accounts on 2-3 platforms and be completing tasks regularly. The focus shifts from setup to consistency and quality improvement.', body_style))
    story.append(sp(6))

    p2_items = [
        'Commit to a daily schedule of 3-5 hours of platform work. Consistency matters more than marathon sessions.',
        'Maintain quality scores above 90% on all platforms. Quality drops lead to project loss.',
        'Expand to new projects as they appear on registered platforms.',
        'Begin building a LinkedIn profile highlighting your AI training experience. This opens doors to better-paying opportunities later.',
        'Learn basic prompt engineering (free courses available on Coursera, YouTube). This skill directly improves your performance on AI training tasks.',
        'Practice typing and reading speed. Faster throughput = higher effective hourly rate.',
        'Track your hourly earnings by platform. Focus time on the best-paying platforms and reduce time on low-return platforms.',
        'Network with other Nigerian contributors on Reddit (r/WFHJobs, r/WorkOnline) and Nigerian tech communities.',
        'If CrowdGen or TELUS have no available work, shift your time to Prolific and any newly accessible platforms.',
        'Avoid common beginner mistakes: using AI tools to complete tasks (instant ban), rushing through tasks (quality drops), ignoring guidelines (rejected work), and spreading yourself too thin across too many platforms.',
    ]
    for item in p2_items:
        story.append(bullet(item))
    story.append(sp(8))

    story.append(Paragraph(f'{B("Expected Earnings at Day 60: $100-$300 total.")} This assumes consistent daily work on 2-3 active platforms. Reality check: many Nigerian beginners earn $150-$200 in their first two months. This is typical, not exceptional.', verdict_warn))
    story.append(sp(12))

    # Phase 3
    story.append(Paragraph('Phase 3: Optimization and Growth (Days 61-90)', h2_style))
    story.append(Paragraph('Phase 3 is about optimizing your workflow, increasing earnings per hour, and positioning for better opportunities. You should now have a clear understanding of which platforms work best for you.', body_style))
    story.append(sp(6))

    p3_items = [
        'Drop platforms that are not producing income. If OneForma or Handshake have not yielded results, stop checking them.',
        'Double down on your best-performing 2-3 platforms.',
        'Apply for specialized projects (coding, translation, domain expertise) on your active platforms. These pay significantly more.',
        'Upskill: learn a high-value skill. Options include basic Python (freeCodeCamp), prompt engineering (LearnPrompting.org), or advanced writing (Grammarly Premium).',
        'Update your CV and LinkedIn with specific AI training experience, platforms used, and tasks completed.',
        'Begin exploring direct freelance AI training opportunities outside of platforms. Some AI companies hire independent contractors directly.',
        'Set a target hourly rate based on your actual data. Do not accept work that pays below your established minimum.',
        'Re-evaluate your platform mix monthly. The AI training industry changes rapidly. New platforms appear, old ones decline.',
        'Save detailed records of all earnings for tax and financial planning purposes.',
    ]
    for item in p3_items:
        story.append(bullet(item))
    story.append(sp(8))

    story.append(Paragraph(f'{B("Expected Earnings at Day 90: $300-$600 total.")} This assumes consistent work and gradual improvement. Exceptional contributors with specialized skills may earn $800-$1,200, but this is NOT the norm. Typical outcome: $400-$500 in 90 days.', verdict_warn))
    story.append(sp(12))

    # Common Mistakes
    story.append(Paragraph('Common Mistakes Beginners Make', h2_style))
    mistakes = [
        'Using ChatGPT or AI tools to complete AI training tasks. Platforms detect this and ban accounts permanently. Never do this.',
        'Trying to bypass geographic restrictions with VPNs. Platforms actively detect and ban VPN users. You will lose your account.',
        'Spending weeks on a single platform waiting for work. If a platform has no tasks after 2 weeks, move on and check back later.',
        'Ignoring qualification test preparation. Tests are competitive. Without studying guidelines, you will fail and waste time.',
        'Quitting after a bad first week. The first week is the hardest. Most contributors do not see earnings until week 3-4.',
        'Not setting up PayPal early. Some platforms require PayPal before you can accept any paid task.',
        'Overcommitting and burning out. Start with 2-3 hours daily, not 8-12. Consistency beats intensity.',
        'Not reading task guidelines. Every project has specific rules. Skipping guidelines leads to rejected work and account penalties.',
        'Expecting full-time income from day one. AI annotation is supplemental income for beginners. It takes months to build meaningful earnings.',
        'Ignoring language skills. If you speak Hausa, Yoruba, or Igbo, you have an advantage. Multilingual contributors earn more.',
    ]
    for m in mistakes:
        story.append(bullet(m))
    story.append(sp(18))

    # ── SECTION 5: Final Recommendations ──
    story.append(Paragraph('5. Final Recommendations', h1_style))
    story.append(Paragraph('These recommendations are ranked by reliability first, not hype. Only platforms with evidence supporting their value for Nigerian beginners are included. The strategy is to register on multiple platforms simultaneously to maximize income opportunity.', body_style))
    story.append(sp(12))

    story.append(Paragraph('Recommended Platform Stack for Nigeria', h2_style))
    story.append(sp(6))

    recommendations = [
        {
            'tier': 'TIER 1: Register Immediately (High Priority)',
            'platforms': 'CrowdGen (Appen) + TELUS Digital + Prolific',
            'why': 'These three platforms are verified as accepting Nigerian contributors, have the longest track records, and offer the most reliable path to first earnings. CrowdGen has the largest project pool. TELUS provides steady (if low-paying) work. Prolific offers reliable payments with zero scam risk. Register on all three in your first week.'
        },
        {
            'tier': 'TIER 2: Register and Test (Medium Priority)',
            'platforms': 'Alignerr + Welocalize + Mecor/Mercor',
            'why': 'These platforms are worth registering for but have some uncertainty. Alignerr has excellent reviews but Nigeria availability is unconfirmed. Welocalize is great for multilingual contributors but work volume is declining. Mercor has potential but geographic restrictions are unclear. Register and test availability; do not invest heavy time until confirmed.'
        },
        {
            'tier': 'TIER 3: Attempt If Possible (Low Priority)',
            'platforms': 'Outlier',
            'why': 'Outlier offers the best pay rates in the industry, but Nigeria availability is uncertain and may be restricted. If you can register and pass assessments from Nigeria, prioritize it. If blocked, accept this and move on. Do not waste time trying to bypass restrictions.'
        },
        {
            'tier': 'SKIP (Do Not Register)',
            'platforms': 'OneForma + Handshake AI',
            'why': 'OneForma has extremely low pay ($2-$5/hr) and scarce work. Handshake AI is a student job board not designed for the Nigerian market. Both platforms represent poor time investment for your goals.'
        },
    ]

    for rec in recommendations:
        tier_color = SEM_SUCCESS if 'TIER 1' in rec['tier'] else (SEM_WARNING if 'TIER 2' in rec['tier'] else (SEM_INFO if 'TIER 3' in rec['tier'] else SEM_ERROR))
        rec_style = ParagraphStyle('RecTier', fontName='FreeSerif-Bold', fontSize=12, textColor=tier_color, spaceBefore=10, spaceAfter=4)
        story.append(Paragraph(rec['tier'], rec_style))
        story.append(Paragraph(f'{B("Platforms:")} {rec["platforms"]}', body_left))
        story.append(Paragraph(f'{B("Why:")} {rec["why"]}', body_style))
        story.append(sp(8))

    story.append(sp(12))

    # Final Summary Table
    story.append(Paragraph('Final Recommendation Summary', h2_style))
    story.append(sp(8))

    sum_headers = ['Platform', 'Register?', 'Priority', 'Expected Monthly (Conservative)', 'Risk Level']
    sum_data = [sum_headers]
    summary_rows = [
        ('CrowdGen (Appen)', 'Yes', 'Tier 1', '$50-$200', 'Low'),
        ('TELUS Digital', 'Yes', 'Tier 1', '$40-$120', 'Low'),
        ('Prolific', 'Yes', 'Tier 1', '$30-$80', 'Very Low'),
        ('Alignerr', 'Yes', 'Tier 2', '$0-$200*', 'Medium'),
        ('Welocalize', 'Yes', 'Tier 2', '$30-$150', 'Low-Medium'),
        ('Mercor', 'Test', 'Tier 2', '$0-$200*', 'Medium'),
        ('Outlier', 'Test', 'Tier 3', '$0-$400*', 'Medium-High'),
        ('OneForma', 'No', 'Skip', '$10-$30', 'Low (waste of time)'),
        ('Handshake AI', 'No', 'Skip', '$0', 'N/A'),
    ]
    sum_data.extend(summary_rows)

    sum_table = Table(sum_data, colWidths=[85, 48, 50, 120, 60])
    sum_table.setStyle(make_table_style(len(sum_data)))
    story.append(sum_table)
    story.append(sp(6))
    story.append(Paragraph('* Earnings range depends on whether the platform is accessible from Nigeria and whether you can pass qualifications. $0 is a real possibility for Tier 2-3 platforms if geographic restrictions apply.', small_style))
    story.append(sp(12))

    story.append(Paragraph('Conservative Monthly Income Projection (After 90 Days)', h2_style))
    story.append(Paragraph('Assuming consistent daily work (3-5 hours) on 2-3 active platforms with solid quality scores:', body_style))
    story.append(sp(8))

    earnings_data = [
        ['Scenario', 'Monthly Earnings', 'Description'],
        ['Conservative (Most Likely)', '$80-$200', 'Active on 2 platforms, average task completion, no specialized skills'],
        ['Moderate', '$200-$400', 'Active on 3 platforms, good quality scores, some language skills'],
        ['Optimistic', '$400-$700', 'Specialized skills (coding/translation), 4+ active platforms, high quality'],
        ['Exceptional', '$700-$1,200+', 'Rare. Requires specialized expertise, Outlier/Mercor access, high-demand skills'],
    ]
    earn_table = Table(earnings_data, colWidths=[120, 90, 250])
    earn_table.setStyle(make_table_style(len(earnings_data)))
    story.append(earn_table)
    story.append(sp(6))
    story.append(Paragraph('These projections are based on verified contributor reports from Nigeria and similar markets. They are conservative. Most beginners fall in the $80-$200 range for the first few months. Growth depends on skill development, platform diversification, and consistent quality.', body_style))
    story.append(sp(18))

    # ── SECTION 6: Source Log ──
    story.append(Paragraph('6. Source Log', h1_style))
    story.append(Paragraph('All major claims in this report are based on the following source categories. Claims without sufficient evidence are labeled as "unverified" in the text.', body_style))
    story.append(sp(12))

    source_cats = [
        ('Official Platform Sources', 'crowdgen.com, outlier.ai, joinhandshake.com, telusinternational.ai, welocalize.com/welodata.ai, alignerr.com, oneforma.com, prolific.com, mercor.com'),
        ('Review Platforms', 'Trustpilot (crowdgen.com, outlier, telusinternational, welocalize, alignerr, oneforma, prolific, mercor), Indeed (Outlier: 775 reviews, TELUS Digital: 3,375 reviews, Welocalize: 367 reviews), Glassdoor (Outlier: 3.2/5, Alignerr: 3.0/5, TELUS Digital)'),
        ('Community Sources', 'Reddit (r/outlier_ai, r/WFHJobs, r/WorkOnline, r/Welocalize, r/alignerr, r/ProlificAc, r/remotework), YouTube review channels, Facebook groups'),
        ('Nigeria-Specific Sources', 'Zikoko ("6 Online Platforms That Pay Nigerians to Train AI"), AfrikStories ("Best AI Platforms That Pay Nigerians in 2026")'),
        ('Industry Analysis', 'RemoWork.life (Top 25 AI Training Platforms 2026), AITrainingJobs.it (platform reviews 2026), AlgorithmWatch (scam and shadow worker reports), Nimdzi Insights (Welocalize LSP ranking)'),
        ('Company Data', 'Appen ASX: APX (public filings), TELUS Corporation TSX: T / NYSE: TU (public filings), Labelbox ($100M+ raised), Y Combinator (Prolific, Handshake backing)'),
    ]

    for cat, sources in source_cats:
        story.append(Paragraph(f'{B(cat)}', h3_style))
        story.append(Paragraph(sources, body_left))
        story.append(sp(6))

    story.append(sp(18))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(sp(6))
    story.append(Paragraph('This report was compiled using web research conducted in July 2026. Platform statuses, pay rates, and availability are subject to change. Re-verify critical information before making decisions. All earnings estimates are conservative projections based on verified contributor reports and are not guarantees of income.', small_style))

    return story


# ─── EXECUTE ───────────────────────────────────────────────────────────
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print('Building PDF body...')
    story = build_pdf()

    print(f'Writing body PDF to {BODY_FILE}...')
    doc = SimpleDocTemplate(
        BODY_FILE,
        pagesize=A4,
        leftMargin=1.8*cm,
        rightMargin=1.8*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
        title='AI Data Annotation Platforms for Nigeria',
        author='Research Analyst',
    )
    doc.build(story)
    print(f'Body PDF complete. Pages written to {BODY_FILE}')

    # Generate cover via HTML
    print('Generating cover HTML...')
    cover_html_path = os.path.join(OUTPUT_DIR, '_cover.html')
    cover_pdf_path = os.path.join(OUTPUT_DIR, '_cover.pdf')
    with open(cover_html_path, 'w') as f:
        f.write(COVER_HTML)

    # Render cover with html2poster.js
    scripts_dir = os.path.expanduser('~/.openclaw/workspace/skills/pdf/scripts')
    if not os.path.exists(scripts_dir):
        scripts_dir = '/home/z/my-project/skills/pdf/scripts'

    print(f'Rendering cover via html2poster.js...')
    import subprocess
    result = subprocess.run(
        ['node', os.path.join(scripts_dir, 'html2poster.js'),
         cover_html_path, '--output', cover_pdf_path, '--width', '794px'],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f'Cover render error: {result.stderr}')
        print('Proceeding with body-only PDF...')
    else:
        print(f'Cover PDF complete: {cover_pdf_path}')

        # Merge cover + body
        print('Merging cover + body...')
        try:
            from pypdf import PdfReader, PdfWriter
            writer = PdfWriter()

            # Add cover
            cover_reader = PdfReader(cover_pdf_path)
            for page in cover_reader.pages:
                writer.add_page(page)

            # Add body
            body_reader = PdfReader(BODY_FILE)
            for page in body_reader.pages:
                writer.add_page(page)

            with open(OUTPUT_FILE, 'wb') as f:
                writer.write(f)
            print(f'FINAL PDF: {OUTPUT_FILE}')
        except Exception as e:
            print(f'Merge error: {e}')
            print(f'Body PDF still available at: {BODY_FILE}')
            # Fallback: rename body to final
            import shutil
            shutil.copy2(BODY_FILE, OUTPUT_FILE)
            print(f'Fallback: body copied to {OUTPUT_FILE}')

    # Cleanup temp files
    final_output = os.path.join(OUTPUT_DIR, 'AI_Platforms_Nigeria_Review.pdf')
    for f in [cover_html_path, cover_pdf_path, BODY_FILE]:
        if os.path.exists(f) and f != final_output:
            try:
                os.remove(f)
            except:
                pass

    # If OUTPUT_FILE was written by merge, it exists
    if not os.path.exists(final_output) and os.path.exists(BODY_FILE):
        import shutil
        shutil.copy2(BODY_FILE, final_output)

    print(f'\nDone! Output: {final_output}')
    return final_output


if __name__ == '__main__':
    main()
