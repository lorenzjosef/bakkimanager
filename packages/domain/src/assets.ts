function svgDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function gradientBackground(start: string, end: string, accent: string, label?: string) {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}"/>
          <stop offset="100%" stop-color="${end}"/>
        </linearGradient>
      </defs>
      <rect width="320" height="220" rx="28" fill="url(#bg)"/>
      <circle cx="250" cy="52" r="34" fill="${accent}" fill-opacity="0.18"/>
      <circle cx="78" cy="172" r="58" fill="#ffffff" fill-opacity="0.08"/>
      <path d="M0 170 C 58 134, 110 196, 176 162 S 278 132, 320 170 L320 220 L0 220 Z" fill="#17301f" fill-opacity="0.22"/>
      ${label
        ? `<text x="24" y="34" font-family="Inter, Arial, sans-serif" font-size="16" fill="#f8faf9" opacity="0.92">${label}</text>`
        : ''}
    </svg>
  `);
}

function forestSurfaceAsset() {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#dbe8de"/>
          <stop offset="42%" stop-color="#93b09c"/>
          <stop offset="100%" stop-color="#365341"/>
        </linearGradient>
        <linearGradient id="ridgeFar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#5d7767"/>
          <stop offset="100%" stop-color="#496655"/>
        </linearGradient>
        <linearGradient id="ridgeNear" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#294533"/>
          <stop offset="100%" stop-color="#1b3325"/>
        </linearGradient>
        <linearGradient id="mist" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.42"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="320" height="220" fill="url(#sky)"/>
      <circle cx="248" cy="42" r="28" fill="#f2f5dd" fill-opacity="0.55"/>
      <path d="M0 114 C 30 95, 64 88, 98 94 S 160 118, 206 100 S 276 80, 320 96 L320 144 L0 144 Z" fill="url(#ridgeFar)" opacity="0.9"/>
      <path d="M0 136 C 34 120, 78 148, 122 132 S 196 102, 248 120 S 294 142, 320 132 L320 180 L0 180 Z" fill="#2c4736" opacity="0.88"/>
      <path d="M0 98 H320 V144 H0 Z" fill="url(#mist)"/>
      <path d="M0 162 C 44 138, 82 182, 132 154 S 222 132, 320 156 L320 220 L0 220 Z" fill="url(#ridgeNear)"/>
      <g fill="#17301f" opacity="0.88">
        <path d="M18 190 l12 -30 l11 30 z"/>
        <path d="M30 190 l10 -42 l12 42 z"/>
        <path d="M54 190 l12 -26 l10 26 z"/>
        <path d="M82 190 l12 -34 l11 34 z"/>
        <path d="M104 190 l11 -46 l13 46 z"/>
        <path d="M130 190 l10 -28 l10 28 z"/>
        <path d="M156 190 l13 -40 l13 40 z"/>
        <path d="M184 190 l12 -32 l11 32 z"/>
        <path d="M210 190 l14 -50 l14 50 z"/>
        <path d="M242 190 l10 -30 l10 30 z"/>
        <path d="M266 190 l12 -44 l12 44 z"/>
        <path d="M294 190 l11 -30 l10 30 z"/>
      </g>
      <g stroke="#dce7d9" stroke-opacity="0.22" fill="none">
        <path d="M26 170 C 74 162, 118 174, 160 166 S 246 150, 302 162"/>
        <path d="M18 182 C 72 174, 122 188, 166 180 S 252 164, 308 176"/>
      </g>
    </svg>
  `);
}

function dashboardTerrainAsset() {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d8e0d8"/>
          <stop offset="100%" stop-color="#99afa4"/>
        </linearGradient>
        <linearGradient id="patchA" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#b9cbb8"/>
          <stop offset="100%" stop-color="#95b09c"/>
        </linearGradient>
        <linearGradient id="patchB" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d7ddd1"/>
          <stop offset="100%" stop-color="#b7c6bb"/>
        </linearGradient>
      </defs>
      <rect width="320" height="220" fill="url(#bg)"/>
      <path d="M0 24 C 46 10, 94 34, 138 22 S 222 -4, 320 22 V88 H0 Z" fill="url(#patchB)" opacity="0.8"/>
      <path d="M0 108 C 54 80, 104 120, 164 92 S 256 62, 320 90 V172 H0 Z" fill="url(#patchA)" opacity="0.86"/>
      <path d="M0 178 C 72 144, 132 194, 198 166 S 286 142, 320 160 V220 H0 Z" fill="#7e9989" opacity="0.72"/>
      <g stroke="#f7fbf7" stroke-opacity="0.55" fill="none" stroke-width="1.2">
        <path d="M16 42 C 52 28, 98 32, 132 44 S 204 68, 246 54 S 286 30, 308 36"/>
        <path d="M6 60 C 48 46, 98 50, 140 62 S 214 84, 258 72 S 296 50, 316 56"/>
        <path d="M12 92 C 64 78, 108 82, 146 92 S 214 114, 262 102 S 300 84, 316 88"/>
        <path d="M8 118 C 58 102, 114 108, 160 122 S 240 150, 286 138 S 306 126, 318 128"/>
        <path d="M18 148 C 62 136, 108 142, 146 152 S 224 176, 274 166 S 300 152, 312 154"/>
        <path d="M26 178 C 72 166, 114 170, 156 182 S 224 206, 272 196 S 300 184, 310 186"/>
      </g>
      <g stroke="#496755" stroke-width="2.2" fill="rgba(255,255,255,0.15)">
        <path d="M54 84 L108 58 L164 82 L126 124 L68 118 Z" fill="#dfe6db" fill-opacity="0.32"/>
        <path d="M168 92 L236 66 L282 102 L236 146 L176 136 Z" fill="#edf2eb" fill-opacity="0.26"/>
      </g>
      <g stroke="#234736" stroke-width="2" stroke-dasharray="7 6" fill="none" opacity="0.74">
        <path d="M96 62 L132 78 L118 114 L84 108 Z"/>
        <path d="M202 84 L244 100 L230 132 L192 122 Z"/>
      </g>
      <path d="M126 108 C 150 118, 174 118, 198 102" stroke="#f8fbf7" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M126 108 C 150 118, 174 118, 198 102" stroke="#6f8777" stroke-width="2.2" stroke-linecap="round"/>
    </svg>
  `);
}

function avatarAsset(initials: string, start: string, end: string) {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}"/>
          <stop offset="100%" stop-color="${end}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="24" fill="url(#g)"/>
      <circle cx="48" cy="36" r="18" fill="#ffffff" fill-opacity="0.18"/>
      <path d="M20 82c6-15 18-23 28-23s22 8 28 23" fill="#ffffff" fill-opacity="0.18"/>
      <text x="48" y="56" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `);
}

function brandMarkAsset() {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <defs>
        <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1f5a37"/>
          <stop offset="100%" stop-color="#153e27"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="8" fill="url(#brand)"/>
      <path d="M13 33V15h8.5c4.8 0 7.6 2.2 7.6 6 0 2.1-1.2 3.9-3.2 4.8L34 33h-7.1l-7-6.6V33H13zm6.8-11.2h1.4c2.2 0 3.4-.8 3.4-2.3s-1.2-2.3-3.4-2.3h-1.4v4.6z" fill="#f6fbf6"/>
    </svg>
  `);
}

function iconAsset(glyph: string, fg = '#154212', bg = 'transparent') {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      ${bg !== 'transparent' ? `<rect width="32" height="32" rx="8" fill="${bg}"/>` : ''}
      <text
        x="16"
        y="16.9"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Epilogue, Inter, Arial, sans-serif"
        font-size="24.5"
        font-weight="800"
        letter-spacing="-0.03em"
        fill="${fg}"
      >${glyph}</text>
    </svg>
  `);
}

export const localAssetUrls = {
  brandMark: '/prototype/brand-mark.png',
  note: iconAsset('i'),
  search: iconAsset('⌕'),
  chevronLeft: iconAsset('‹'),
  chevronRight: iconAsset('›'),
  plusArrow: iconAsset('+'),
  sync: iconAsset('⟳'),
  export: iconAsset('⇩'),
  create: iconAsset('+'),
  verified: iconAsset('✓'),
  trend: iconAsset('↗'),
  phaseStart: iconAsset('→'),
  phaseLabel: iconAsset('◎'),
  saplings: iconAsset('T'),
  team: iconAsset('👥', '#2f4f67', '#eef2f7'),
  menu: iconAsset('⋯'),
  climate: iconAsset('◌'),
  nitrogen: iconAsset('✦'),
  close: iconAsset('×', '#425244', '#f4f6f3'),
  mapAreaSpecies: iconAsset('🌿', '#154212', '#eef5ee'),
  mapAreaCount: iconAsset('#', '#154212', '#eef5ee'),
  mapTaskPlanting: iconAsset('P', '#154212', '#eef5ee'),
  mapTaskMonitoring: iconAsset('M', '#315d7d', '#eef3f8'),
  mapTaskFertilizing: iconAsset('F', '#4f5f6f', '#eff1f3'),
  select: iconAsset('⌄'),
  searchTeam: iconAsset('⌕'),
  calendar: iconAsset('◷'),
  draft: iconAsset('D'),
  deploy: iconAsset('→', '#ffffff', '#154212'),
  actionTask: iconAsset('+'),
  actionGeometry: iconAsset('✎'),
  toolPrimary: iconAsset('▣'),
  toolSecondary: iconAsset('◫'),
  toolPen: iconAsset('✎'),
  toolArea: iconAsset('▭'),
  toolNode: iconAsset('•'),
  zoomIn: iconAsset('+'),
  zoomOut: iconAsset('−'),
  reset: iconAsset('O'),
  layer: iconAsset('≡'),
  save: iconAsset('✓', '#ffffff', '#154212'),
  onboard: iconAsset('+'),
  preview: iconAsset('⚙'),
  permissions: iconAsset('🔒', '#1f2937', '#f3f4f6'),
  accessEnabled: iconAsset('✓'),
  accessDisabled: iconAsset('–', '#78716c', '#f3f4f6'),
  updateStock: iconAsset('↻'),
  addSpecies: iconAsset('+', '#ffffff', '#154212'),
  editSpecies: iconAsset('✎'),
  dashboardMap: '/prototype/dashboard-map.png',
  phaseMap: '/prototype/phase-map.png',
  taskMap: '/prototype/task-map.png',
  forest: '/prototype/dashboard-forest.png',
  phaseOverviewStartButton: '/prototype/phases/overview-start-button.svg',
  phaseOverviewSectionLabel: '/prototype/phases/overview-section-label.svg',
  phaseOverviewMetricSaplings: '/prototype/phases/overview-metric-saplings.svg',
  phaseOverviewMetricTeam: '/prototype/phases/overview-metric-team.svg',
  phaseOverviewExport: '/prototype/phases/overview-export.svg',
  phaseOverviewMemberAction: '/prototype/phases/overview-member-action.svg',
  phaseOverviewWeather: '/prototype/phases/overview-weather.svg',
  phaseOverviewNitrogen: '/prototype/phases/overview-nitrogen.svg',
  phaseOverviewBannerMark: '/prototype/phases/overview-banner-mark.svg',
  wizardInfoBack: '/prototype/phases/wizard-info-back.svg',
  wizardInfoHelp: '/prototype/phases/wizard-info-help.svg',
  wizardInfoProfile: '/prototype/phases/wizard-info-profile.svg',
  wizardInfoNext: '/prototype/phases/wizard-info-next.svg',
  wizardTeamBack: '/prototype/phases/wizard-team-back.svg',
  wizardTeamHelp: '/prototype/phases/wizard-team-help.svg',
  wizardTeamProfile: '/prototype/phases/wizard-team-profile.svg',
  wizardTeamSelect: '/prototype/phases/wizard-team-select.svg',
  wizardTeamChipRemove: '/prototype/phases/wizard-team-chip-remove.svg',
  wizardTeamNote: '/prototype/phases/wizard-team-note.svg',
  wizardTeamCardHead: '/prototype/phases/wizard-team-card-head.svg',
  wizardTeamFooterBack: '/prototype/phases/wizard-team-footer-back.svg',
  wizardTeamNext: '/prototype/phases/wizard-team-next.svg',
  wizardAreasBack: '/prototype/phases/wizard-areas-back.svg',
  wizardAreasHelp: '/prototype/phases/wizard-areas-help.svg',
  wizardAreasProfile: '/prototype/phases/wizard-areas-profile.svg',
  wizardAreasToolPrimary: '/prototype/phases/wizard-areas-tool-primary.svg',
  wizardAreasToolSecondary: '/prototype/phases/wizard-areas-tool-secondary.svg',
  wizardAreasToolPen: '/prototype/phases/wizard-areas-tool-pen.svg',
  wizardAreasToolReset: '/prototype/phases/wizard-areas-tool-reset.svg',
  wizardAreasCapacity: '/prototype/phases/wizard-areas-capacity.svg',
  wizardAreasSearchSelect: '/prototype/phases/wizard-areas-search-select.svg',
  wizardTaskPlanting: '/prototype/phases/wizard-task-planting.svg',
  wizardTaskMonitoring: '/prototype/phases/wizard-task-monitoring.svg',
  wizardTaskFertilizing: '/prototype/phases/wizard-task-fertilizing.svg',
  wizardAreasSoilNote: '/prototype/phases/wizard-areas-soil-note.svg',
  wizardAreasFooterBack: '/prototype/phases/wizard-areas-footer-back.svg',
  wizardAreasNext: '/prototype/phases/wizard-areas-next.svg',
  wizardConfirmBack: '/prototype/phases/wizard-confirm-back.svg',
  wizardConfirmHelp: '/prototype/phases/wizard-confirm-help.svg',
  wizardConfirmProfile: '/prototype/phases/wizard-confirm-profile.svg',
  wizardConfirmZoneHead: '/prototype/phases/wizard-confirm-zone-head.svg',
  wizardConfirmZoneHeadAlt: '/prototype/phases/wizard-confirm-zone-head-alt.svg',
  wizardConfirmMapLabel: '/prototype/phases/wizard-confirm-map-label.svg',
  wizardConfirmButton: '/prototype/phases/wizard-confirm-confirm.svg',
  wizardConfirmFooterBack: '/prototype/phases/wizard-confirm-footer-back.svg',
  speciesDowny: gradientBackground('#d7dcc7', '#92ab85', '#224534', 'Birch'),
  speciesRowan: gradientBackground('#d1d6c6', '#8f6f59', '#3d3127', 'Rowan'),
  speciesSpruce: gradientBackground('#b8c2b7', '#516b59', '#143325', 'Spruce'),
  speciesWillow: gradientBackground('#d4dacb', '#7ea086', '#28463a', 'Willow'),
  speciesHero: gradientBackground('#cfd8c7', '#7d996f', '#183728'),
  mapPhotoA: gradientBackground('#c6d3c5', '#7e9875', '#173425', 'Sapling Detail'),
  mapPhotoB: gradientBackground('#b9c8cd', '#6c8a8b', '#1c3942', 'Sector Overview'),
  userBjorn: avatarAsset('BS', '#35583f', '#214431'),
  userHelga: avatarAsset('HJ', '#6d8c78', '#48695a'),
  userEinar: avatarAsset('EÞ', '#687a8c', '#495568'),
  phaseSigurdur: avatarAsset('SJ', '#315d45', '#183d2a'),
  phaseElva: avatarAsset('ET', '#788f73', '#526554'),
  phaseKristjan: avatarAsset('KP', '#577180', '#33485d'),
  taskErik: avatarAsset('ET', '#315d45', '#183d2a'),
  taskAnna: avatarAsset('AS', '#6b7c8f', '#425366'),
  taskBjorn: avatarAsset('BH', '#6a8a78', '#415d4a'),
  ownerAlain: avatarAsset('AC', '#4b6e57', '#2a4a37'),
  planterMrsBaue: avatarAsset('MB', '#768a6b', '#53654a'),
  planterMrBaue: avatarAsset('MB', '#6c7f8f', '#425366'),
} as const;
