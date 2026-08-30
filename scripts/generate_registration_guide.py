#!/usr/bin/env python3
"""
LinkedIn + Platform Registration Guide for Kennedy Hachimeganum
Comprehensive PDF with exact steps, copy-paste content, and LinkedIn profile setup.
"""
import os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.colors import HexColor

# ─── Fonts ───
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')

# ─── Colors ───
HEADER_FILL = HexColor('#2f454f')
ACCENT = HexColor('#1f6c92')
TEXT_PRIMARY = HexColor('#1c1e1f')
TEXT_MUTED = HexColor('#767d80')
BORDER = HexColor('#bcccd4')
TABLE_STRIPE = HexColor('#eaecee')
SEM_SUCCESS = HexColor('#427e56')
SEM_WARNING = HexColor('#978051')
SEM_ERROR = HexColor('#ae4d44')

# ─── Styles ───
h1 = ParagraphStyle('H1', fontName='FreeSerif-Bold', fontSize=20, leading=26,
    textColor=HEADER_FILL, spaceBefore=20, spaceAfter=10)
h2 = ParagraphStyle('H2', fontName='FreeSerif-Bold', fontSize=15, leading=20,
    textColor=ACCENT, spaceBefore=16, spaceAfter=8)
h3 = ParagraphStyle('H3', fontName='FreeSerif-Bold', fontSize=12, leading=16,
    textColor=HexColor('#487991'), spaceBefore=10, spaceAfter=6)
body = ParagraphStyle('Body', fontName='FreeSerif', fontSize=10.5, leading=17,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=6)
body_l = ParagraphStyle('BodyL', fontName='FreeSerif', fontSize=10.5, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=4)
bullet = ParagraphStyle('Bullet', fontName='FreeSerif', fontSize=10.5, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, leftIndent=18, bulletIndent=6,
    spaceBefore=2, spaceAfter=2)
small = ParagraphStyle('Small', fontName='FreeSerif-Italic', fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_LEFT)
meta = ParagraphStyle('Meta', fontName='FreeSerif', fontSize=9, leading=13,
    textColor=TEXT_MUTED)
callout = ParagraphStyle('Callout', fontName='FreeSerif-Bold', fontSize=10.5,
    leading=16, textColor=ACCENT, alignment=TA_LEFT, spaceBefore=6, spaceAfter=6,
    leftIndent=8, borderWidth=0)
copy_box = ParagraphStyle('CopyBox', fontName='FreeSerif', fontSize=10, leading=15,
    textColor=HexColor('#1a2d38'), alignment=TA_LEFT,
    backColor=HexColor('#eef3f5'), borderPadding=8,
    spaceBefore=4, spaceAfter=4, leftIndent=6, rightIndent=6)
step_num = ParagraphStyle('StepNum', fontName='FreeSerif-Bold', fontSize=18,
    leading=22, textColor=ACCENT, alignment=TA_CENTER)

def safe(text):
    import re
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r'[\u200b-\u200f\u2028-\u202f\u2060\ufeff]', '', text)
    text = text.replace('\ufffd', '')
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return text

def B(t): return f'<b>{safe(t)}</b>'
def I(t): return f'<i>{safe(t)}</i>'

def make_table_style(n):
    cmds = [
        ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'FreeSerif-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9.5),
        ('FONTNAME', (0,1), (-1,-1), 'FreeSerif'),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('LEADING', (0,0), (-1,-1), 14),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]
    for i in range(1, n):
        bg = TABLE_STRIPE if i % 2 == 0 else colors.white
        cmds.append(('BACKGROUND', (0,i), (-1,i), bg))
    return TableStyle(cmds)

OUTPUT = '/home/z/my-project/download/Kennedy_Registration_Guide.pdf'

def build():
    story = []
    doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
        leftMargin=1.8*cm, rightMargin=1.8*cm, topMargin=2*cm, bottomMargin=2*cm,
        title='Platform Registration & LinkedIn Guide',
        author='Research Analyst')

    # ─── TITLE ───
    story.append(Spacer(1, 80))
    story.append(Paragraph('Platform Registration Guide<br/>& LinkedIn Profile Setup', ParagraphStyle('T', fontName='FreeSerif-Bold', fontSize=26, leading=34, alignment=TA_CENTER, textColor=TEXT_PRIMARY)))
    story.append(Spacer(1, 12))
    story.append(Paragraph('Wike-Young Kennedy Hachimeganum', ParagraphStyle('Sub', fontName='FreeSerif-Italic', fontSize=14, leading=18, alignment=TA_CENTER, textColor=ACCENT)))
    story.append(Spacer(1, 6))
    story.append(Paragraph('Port Harcourt, Rivers State, Nigeria | wikeyoung41@gmail.com', meta))
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width='60%', thickness=1, color=ACCENT, spaceAfter=20))
    story.append(Paragraph('Step-by-step instructions for registering on every recommended platform, creating your LinkedIn profile, and optimizing your applications for AI data annotation work.', body))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════
    # SECTION 1: ACCOUNTS TO CREATE BEFORE ANYTHING
    # ════════════════════════════════════════════════════
    story.append(Paragraph('1. Payment Accounts (Do This First)', h1))
    story.append(Paragraph('Before registering on any AI platform, set up these payment accounts. You will need them to receive earnings. Most platforms require payment setup before you can accept paid tasks.', body))
    story.append(Spacer(1, 8))

    # PayPal
    story.append(Paragraph('Step 1: PayPal Account', h2))
    story.append(Paragraph('PayPal is the most widely accepted payment method across all platforms reviewed. Set this up first.', body))
    story.append(Spacer(1, 4))

    paypal_steps = [
        'Go to <b>paypal.com/ng</b> and click "Sign Up"',
        'Choose <b>Personal Account</b> (not Business)',
        'Use email: <b>wikeyoung41@gmail.com</b>',
        'Enter your real name: <b>Wike-Young Kennedy Hachimeganum</b>',
        'Phone: <b>+234 816 012 4516</b>',
        'Address: <b>Port Harcourt, Rivers State, Nigeria</b>',
        'Verify your email address (check spam folder)',
        'Link your bank account or debit card for withdrawals',
        'Complete identity verification (upload valid ID)',
    ]
    for s in paypal_steps:
        story.append(Paragraph(s, bullet))
    story.append(Spacer(1, 8))

    # Payoneer
    story.append(Paragraph('Step 2: Payoneer Account (Backup)', h2))
    story.append(Paragraph('Payoneer is accepted by some platforms as an alternative to PayPal. Set it up as a backup.', body))
    story.append(Spacer(1, 4))

    payoneer_steps = [
        'Go to <b>payoneer.com</b> and click "Register"',
        'Use the same email: <b>wikeyoung41@gmail.com</b>',
        'Enter your real details (same as PayPal)',
        'Choose "Withdraw to local bank account" for Nigeria',
        'Complete identity verification',
    ]
    for s in payoneer_steps:
        story.append(Paragraph(s, bullet))
    story.append(Spacer(1, 18))

    # ════════════════════════════════════════════════════
    # SECTION 2: PLATFORM REGISTRATION (EACH ONE)
    # ════════════════════════════════════════════════════
    story.append(Paragraph('2. Platform Registration Steps', h1))
    story.append(Paragraph('Register on Tier 1 platforms first (CrowdGen, TELUS Digital, Prolific), then move to Tier 2. Each registration takes 20-45 minutes. Complete all registrations within your first week.', body))
    story.append(Spacer(1, 12))

    # ── CrowdGen ──
    story.append(Paragraph('2.1 CrowdGen (Appen) -- TIER 1 -- Register Immediately', h2))
    crowdgen_steps = [
        ('Go to', 'crowdgen.com'),
        ('Click', '"Get Started" or "Join Now"'),
        ('Sign up with', 'wikeyoung41@gmail.com'),
        ('Full name', 'Wike-Young Kennedy Hachimeganum'),
        ('Country', 'Nigeria'),
        ('City', 'Port Harcourt'),
        ('Languages', 'English (Fluent), Ikwerre (Native), Igbo (Basic)'),
        ('Education', 'O\'Level / Secondary School Certificate'),
        ('Skills', 'Data annotation, writing, internet research, attention to detail'),
        ('Important', 'COMPLETE EVERY FIELD. Empty profiles get fewer project matches.'),
        ('After registration', 'Browse available projects. Apply to ALL that match your skills.'),
        ('Before tests', 'Read ALL project guidelines carefully. Study them twice.'),
    ]
    for label, val in crowdgen_steps:
        story.append(Paragraph(f'<b>{label}:</b> {safe(val)}', bullet))
    story.append(Spacer(1, 4))
    story.append(Paragraph('KEY TIP: On CrowdGen, your Ikwerre language skill is a MAJOR advantage. Many projects need Nigerian language speakers. Make sure to list it prominently.', callout))
    story.append(Spacer(1, 14))

    # ── TELUS Digital ──
    story.append(Paragraph('2.2 TELUS Digital -- TIER 1 -- Register Immediately', h2))
    telus_steps = [
        ('Go to', 'telusinternational.ai'),
        ('Click', '"Join Us" or "Apply Now"'),
        ('Create account', 'with wikeyoung41@gmail.com'),
        ('Full details', 'Wike-Young Kennedy Hachimeganum, Port Harcourt, Nigeria'),
        ('Languages', 'English, Ikwerre, Igbo (emphasize ALL languages)'),
        ('Assessment', 'You will receive search evaluation and/or map rating tests'),
        ('Preparation', 'Practice with: searchqualityevaluator.com and similar free resources'),
        ('Important', 'TELUS onboarding can take weeks. Register early and be patient.'),
    ]
    for label, val in telus_steps:
        story.append(Paragraph(f'<b>{label}:</b> {safe(val)}', bullet))
    story.append(Spacer(1, 14))

    # ── Prolific ──
    story.append(Paragraph('2.3 Prolific -- TIER 1 -- Register Immediately', h2))
    prolific_steps = [
        ('Go to', 'prolific.com/participants'),
        ('Click', '"Create Account" or "Sign Up as Participant"'),
        ('Email', 'wikeyoung41@gmail.com'),
        ('Demographic profile', 'FILL IN EVERYTHING. Age, gender, education, location, language skills.'),
        ('Why detail matters', 'Researchers filter participants by demographics. More detail = more studies.'),
        ('After registration', 'Studies will appear on your dashboard. Accept ones you qualify for.'),
        ('Payment', 'Automatic via PayPal after study completion. Usually within days.'),
    ]
    for label, val in prolific_steps:
        story.append(Paragraph(f'<b>{label}:</b> {safe(val)}', bullet))
    story.append(Spacer(1, 14))

    # ── Alignerr ──
    story.append(Paragraph('2.4 Alignerr -- TIER 2 -- Register and Test', h2))
    alignerr_steps = [
        ('Go to', 'alignerr.com'),
        ('Click', '"Join" or "Apply"'),
        ('Sign up', 'with wikeyoung41@gmail.com'),
        ('Complete profile', 'Include all skills, languages, areas of expertise'),
        ('AI Interview', 'Complete the AI-guided interview with "Zara" (their AI interviewer)'),
        ('Important', 'Test if Nigeria is accessible. If projects are not visible after registration, it may be geo-restricted.'),
        ('Pay attention', 'Alignerr has a 4.1/5 Trustpilot rating. Good platform if accessible.'),
    ]
    for label, val in alignerr_steps:
        story.append(Paragraph(f'<b>{label}:</b> {safe(val)}', bullet))
    story.append(Spacer(1, 14))

    # ── Welocalize ──
    story.append(Paragraph('2.5 Welocalize / Welo Data -- TIER 2 -- Register and Test', h2))
    welocalize_steps = [
        ('Go to', 'welodata.ai/join-the-community'),
        ('Click', '"Join the Community"'),
        ('Create account', 'with wikeyoung41@gmail.com'),
        ('Language skills', 'English (Fluent), Ikwerre (Native) -- THIS IS YOUR BIGGEST ASSET HERE'),
        ('Why Ikwerre matters', 'Welocalize specializes in localization. Nigerian language speakers are in demand.'),
        ('Take tests', 'Language proficiency tests in English and any Nigerian language you speak'),
        ('Account setup', 'May need multiple sub-accounts (their system is complex, be patient)'),
    ]
    for label, val in welocalize_steps:
        story.append(Paragraph(f'<b>{label}:</b> {safe(val)}', bullet))
    story.append(Spacer(1, 14))

    # ── Mercor ──
    story.append(Paragraph('2.6 Mercor -- TIER 2 -- Register and Test', h2))
    mercor_steps = [
        ('Go to', 'work.mercor.com'),
        ('Sign up', 'with wikeyoung41@gmail.com'),
        ('Browse roles', 'Look for entry-level AI training roles ($10-$15/hour range)'),
        ('Apply to roles', 'That match your skills (writing, evaluation, general tasks)'),
        ('If blocked', 'Accept and move on. Do NOT try to bypass geo-restrictions.'),
    ]
    for label, val in mercor_steps:
        story.append(Paragraph(f'<b>{label}:</b> {safe(val)}', bullet))
    story.append(Spacer(1, 14))

    # ── Outlier ──
    story.append(Paragraph('2.7 Outlier -- TIER 3 -- Try Once', h2))
    outlier_steps = [
        ('Go to', 'outlier.ai'),
        ('Apply', 'with wikeyoung41@gmail.com'),
        ('Select expertise', 'Writing, general knowledge, or any relevant domain'),
        ('Take assessment', 'If allowed (domain-specific test)'),
        ('If geo-blocked', 'Accept immediately. Do not waste time trying to bypass.'),
        ('If accepted', 'Prioritize this platform. Best pay rates in the industry.'),
    ]
    for label, val in outlier_steps:
        story.append(Paragraph(f'<b>{label}:</b> {safe(val)}', bullet))
    story.append(Spacer(1, 18))

    # ════════════════════════════════════════════════════
    # SECTION 3: LINKEDIN PROFILE SETUP
    # ════════════════════════════════════════════════════
    story.append(Paragraph('3. LinkedIn Profile Setup', h1))
    story.append(Paragraph('LinkedIn is NOT required for AI platform applications, but having a professional profile helps in two ways: (1) Some platforms and AI companies check LinkedIn during verification, and (2) It opens doors to direct freelance AI training opportunities that pay more than platforms. Create this in your second week.', body))
    story.append(Spacer(1, 12))

    story.append(Paragraph('Step-by-Step LinkedIn Creation', h2))
    story.append(Spacer(1, 4))

    story.append(Paragraph('Step 1: Account Creation', h3))
    linkedin_create = [
        'Go to <b>linkedin.com</b>',
        'Click "Join now"',
        'Use email: <b>wikeyoung41@gmail.com</b>',
        'First name: <b>Wike-Young</b>',
        'Last name: <b>Hachimeganum</b>',
        'Use a clear, professional photo (headshot, plain background, good lighting)',
    ]
    for s in linkedin_create:
        story.append(Paragraph(s, bullet))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Step 2: Headline (The Line Under Your Name)', h3))
    story.append(Paragraph('This is the most important text on your profile. Copy this exactly:', body))
    story.append(Spacer(1, 4))
    story.append(Paragraph('<b>AI Data Annotator | Multilingual Contributor (English, Ikwerre, Igbo) | Remote Work Specialist | Quality-Focused</b>', ParagraphStyle('Box', fontName='FreeSerif', fontSize=10.5, leading=16, textColor=HexColor('#1a2d38'), alignment=TA_CENTER, backColor=HexColor('#eef3f5'), borderPadding=10)))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Step 3: About Section', h3))
    story.append(Paragraph('This goes in the "About" section of your profile. Edit it to match your actual experience as you grow:', body))
    story.append(Spacer(1, 4))
    story.append(Paragraph(I('"Detail-oriented and motivated remote contributor specializing in AI data annotation, text evaluation, and multilingual data quality. Native Ikwerre speaker with fluent English and partial Igbo comprehension, providing unique capabilities for Nigerian-language AI training and localization projects. Experienced in search relevance evaluation, image labeling, text classification, and AI output quality assessment across multiple platforms including CrowdGen, TELUS Digital, and Prolific. Committed to maintaining quality scores above 90% through consistent guideline adherence and continuous improvement. Available for freelance AI training projects and long-term contributor roles. Based in Port Harcourt, Nigeria with reliable internet access and flexible scheduling."'), body))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Step 4: Experience Section', h3))
    story.append(Paragraph('Add this as your current position:', body))
    story.append(Spacer(1, 4))

    exp_data = [
        ['Field', 'What to Enter'],
        ['Title', 'AI Data Annotation Contributor'],
        ['Company', 'Independent / Freelance'],
        ['Start Date', 'July 2026 (or your actual start date)'],
        ['Description', 'Contributing to AI model training through data annotation, text evaluation, and quality assessment on platforms including CrowdGen, TELUS Digital, and Prolific. Specializing in English and Nigerian-language (Ikwerre) AI training datasets. Maintaining quality scores above 90% through strict guideline adherence.'],
    ]
    exp_table = Table(exp_data, colWidths=[100, 370])
    exp_table.setStyle(make_table_style(len(exp_data)))
    story.append(exp_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph('Step 5: Skills Section', h3))
    skills = [
        'AI Data Annotation', 'Text Evaluation', 'Search Relevance Assessment',
        'Image Labeling', 'Multilingual Data Collection', 'Quality Assurance',
        'Remote Work', 'English (Fluent)', 'Ikwerre (Native)', 'Igbo (Basic)',
        'Internet Research', 'Attention to Detail', 'Time Management',
        'Microsoft Office', 'Google Workspace'
    ]
    for sk in skills:
        story.append(Paragraph(sk, bullet))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Step 6: Education', h3))
    story.append(Paragraph('Enter your O\'Level certificate. Even though it is secondary education, having it listed shows completeness. If you have any online course certificates (Coursera, freeCodeCamp, etc.), add those under "Licenses and Certifications."', body))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Step 7: Profile URL', h3))
    story.append(Paragraph('Customize your LinkedIn URL after creation. Go to your profile, click "Edit public profile", and change the URL to something like: <b>linkedin.com/in/kennedy-hachimeganum</b>', body))
    story.append(Spacer(1, 18))

    # ════════════════════════════════════════════════════
    # SECTION 4: PROFILE TIPS FOR EACH PLATFORM
    # ════════════════════════════════════════════════════
    story.append(Paragraph('4. Platform-Specific Profile Tips', h1))
    story.append(Paragraph('Each platform has different profile optimization strategies. Here is exactly what to emphasize on each one.', body))
    story.append(Spacer(1, 12))

    tips_data = [
        ['Platform', 'What to Emphasize', 'What to Avoid'],
        ['CrowdGen', 'Ikwerre + English bilingual skills. Any domain knowledge (local culture, Nigerian context). Attention to detail in guidelines.', 'Do not skip language fields. Do not leave skills section empty. Do not use VPN.'],
        ['TELUS Digital', 'Search evaluation experience. Nigerian web search familiarity. Map rating skills (Google Maps knowledge of Port Harcourt area).', 'Do not rush assessments. Do not guess answers. Accuracy matters more than speed.'],
        ['Prolific', 'Complete ALL demographic fields. Honest responses to screening questions. Nigerian perspective on research topics.', 'Do not use bots or AI to speed through studies. They detect this.'],
        ['Alignerr', 'Writing ability. Critical thinking. Any domain expertise (even hobbies). General knowledge breadth.', 'Do not exaggerate expertise. The AI interview tests are real.'],
        ['Welocalize', 'IKWERRE LANGUAGE IS YOUR BIGGEST ASSET HERE. Also English proficiency. Cultural knowledge of Rivers State.', 'Do not ignore the language tests. They determine project matching.'],
        ['Mercor', 'Any expertise areas. Writing quality. Availability for consistent work.', 'Do not apply for coding roles unless you actually code.'],
        ['Outlier', 'Writing quality. Domain expertise if any. Critical thinking and reasoning ability.', 'Do not use AI to write responses during assessment. They test for this specifically.'],
    ]

    tip_table = Table(tips_data, colWidths=[65, 200, 205])
    tip_table.setStyle(make_table_style(len(tips_data)))
    story.append(tip_table)
    story.append(Spacer(1, 18))

    # ════════════════════════════════════════════════════
    # SECTION 5: COMMON MISTAKES TO AVOID
    # ════════════════════════════════════════════════════
    story.append(Paragraph('5. Common Mistakes That Get Nigerians Rejected', h1))
    story.append(Paragraph('These are the most common reasons Nigerian applicants fail to get approved or lose access. Avoid ALL of these.', body))
    story.append(Spacer(1, 8))

    mistakes = [
        '<b>Using VPN to bypass geo-restrictions.</b> Platforms actively detect VPNs. You will be permanently banned. If a platform is not available in Nigeria, accept it and move on.',
        '<b>Using ChatGPT or AI tools to complete tasks.</b> Every platform tests for AI-generated responses. Detection is sophisticated. Permanent ban, no appeal.',
        '<b>Rushing through qualification tests without studying guidelines.</b> Tests are designed to verify you read the instructions. Failed tests mean wasted time and delayed earnings.',
        '<b>Leaving profile fields empty.</b> Empty profiles get fewer project matches. Complete EVERY field, especially language skills.',
        '<b>Ignoring Nigerian language skills.</b> Ikwerre is a valuable, rare language. Platforms like Welocalize specifically need Nigerian language speakers. Always list it.',
        '<b>Using a casual email address.</b> Your email (wikeyoung41@gmail.com) is professional. Do not create additional accounts with nicknames or casual names.',
        '<b>Sharing accounts with friends.</b> Account sharing is detected and results in permanent bans for all involved accounts.',
        '<b>Not reading task guidelines before starting.</b> Each project has specific rules. Skipping guidelines leads to rejected work and quality score drops.',
        '<b>Giving up after one bad week.</b> The first week is the hardest. Most contributors do not see earnings until week 3-4. Persistence is the difference between success and failure.',
        '<b>Spreading yourself too thin.</b> Start with 2-3 platforms. Master them before adding more. Quality > Quantity.',
    ]

    for m in mistakes:
        story.append(Paragraph(m, bullet))
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 18))

    # ════════════════════════════════════════════════════
    # SECTION 6: WHAT TO DO AFTER REGISTRATION
    # ════════════════════════════════════════════════════
    story.append(Paragraph('6. Your First 7 Days: Daily Checklist', h1))
    story.append(Paragraph('Follow this exact schedule for your first week. Check off each item in your 90-Day Tracker spreadsheet.', body))
    story.append(Spacer(1, 8))

    week_data = [
        ['Day', 'Tasks', 'Time Required'],
        ['Day 1', 'Create PayPal account. Create Payoneer account. Set up workspace. Take typing speed test (10fastfingers.com).', '2-3 hours'],
        ['Day 2', 'Register on CrowdGen. Complete full profile. Apply to matching projects. Register on TELUS Digital.', '2-3 hours'],
        ['Day 3', 'Register on Prolific. Complete ALL demographic fields. Register on Alignerr. Complete AI interview.', '2-3 hours'],
        ['Day 4', 'Register on Welocalize. Register on Mercor. Attempt Outlier registration. Update 90-Day Tracker.', '2-3 hours'],
        ['Day 5', 'Begin CrowdGen qualification tests. Study guidelines for 1 hour before each test. Check Prolific for studies.', '3-4 hours'],
        ['Day 6', 'Complete TELUS Digital assessments. Continue CrowdGen tests. Accept Prolific studies.', '3-4 hours'],
        ['Day 7', 'Review all registrations. Follow up on pending verifications. Plan Week 2 schedule. Update tracker.', '2 hours'],
    ]
    week_table = Table(week_data, colWidths=[50, 340, 85])
    week_table.setStyle(make_table_style(len(week_data)))
    story.append(week_table)

    story.append(Spacer(1, 18))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))
    story.append(Spacer(1, 6))
    story.append(Paragraph('This guide was prepared specifically for Wike-Young Kennedy Hachimeganum based on the comprehensive AI platform research report. Follow it step by step, track your progress in the 90-Day Tracker spreadsheet, and reference the main research PDF for detailed platform analysis. Your success depends on consistency, patience, and following the rules. Start today.', small))

    doc.build(story)
    print(f'Guide saved to: {OUTPUT}')
    return OUTPUT

if __name__ == '__main__':
    build()
