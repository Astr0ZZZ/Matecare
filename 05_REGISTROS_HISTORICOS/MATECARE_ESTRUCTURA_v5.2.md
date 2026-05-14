# MATECARE — ESTRUCTURA DE CARPETAS v5.2

## matecare-backend

```
matecare-backend/
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── 20260504022255_init/migration.sql
│       ├── 20260504202922_add_missions/migration.sql
│       ├── 20260505213826_add_mbti_personality_system/migration.sql
│       ├── 20260508013901_add_push_token/migration.sql
│       ├── 20260508015203_add_daily_tactic_context/migration.sql
│       ├── 20260508042420_add_emotional_record/migration.sql
│       └── migration_lock.toml
├── scripts/
│   ├── deepface_server_v2.py        ← servidor Python local (localhost:5001)
│   ├── yolov8n.pt                   ← modelo YOLO (no se usa en prod)
│   ├── yolov8n-pose.pt              ← modelo YOLO pose (no se usa en prod)
│   └── models/
│       └── face_landmarker.task     ← modelo MediaPipe
├── src/
│   ├── index.ts                     ← entrada, registro de rutas
│   ├── controllers/
│   │   ├── ai.controller.ts         ← handleChat, getDailyRecommendation
│   │   ├── cycle.controller.ts
│   │   ├── dashboard.controller.ts  ← getDashboardSummary
│   │   ├── missions.controller.ts   ← getSuggestedMissions, updateMissionProgress, resetMissions, getMissionHistory
│   │   ├── profile.controller.ts    ← saveProfile, getProfile, getRanking, updatePushToken, getCycleStatus
│   │   └── vision.controller.ts     ← handleVisionChat
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── supabase.ts
│   ├── middleware/
│   │   └── auth.middleware.ts       ← requireAuth (valida JWT Supabase)
│   ├── prompts/
│   │   ├── copilot.prompt.ts        ← COPILOT_SYSTEM_PROMPT (Agente 2 masculino)
│   │   └── interpreter.prompt.ts   ← INTERPRETER_SYSTEM_PROMPT (Agente 1)
│   ├── routes/
│   │   ├── ai.routes.ts             ← /chat, /recommendation/:userId, /vision-chat
│   │   ├── cycle.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── missions.routes.ts       ← falta endpoint /:id/evidence
│   │   └── profile.routes.ts        ← /, /current/:userId, /leaderboard/all, /push-token
│   ├── services/
│   │   ├── ai.service.ts            ← runUnifiedTacticalAI, getOracleAdvice, processChat, generateMissions(ELIMINAR)
│   │   ├── cycleEngine.service.ts
│   │   ├── notificationScheduler.service.ts
│   │   ├── personalityMapper.service.ts
│   │   └── visionAnalysis.service.ts ← circuit breaker → localhost:5001
│   └── types/
│       ├── personalityTypes.ts
│       └── vision.ts
└── jobs/
    └── dailyPhaseCheck.job.ts
```

## matecare-mobile

```
matecare-mobile/
├── .env.example                     ← EXPO_PUBLIC_API_URL
├── app.json
├── app/
│   ├── _layout.tsx                  ← AuthGuard global
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (onboarding)/
│   │   ├── _layout.tsx
│   │   ├── confirm.tsx
│   │   ├── cycle-setup.tsx
│   │   ├── personality-quiz.tsx
│   │   └── theme-select.tsx
│   └── (tabs)/
│       ├── _layout.tsx              ← definición de tabs
│       ├── index.tsx                ← Dashboard (polling, chips, misiones, oráculo)
│       ├── chat.tsx                 ← Chat IA (solo agente masculino)
│       ├── vision-scan.tsx          ← Lectura Visual (foto → GPT + Python)
│       ├── calendar.tsx             ← Calendario (cálculo local, sin backend)
│       ├── ranking.tsx              ← Ranking ⚠️ tiene código de profile.tsx duplicado — limpiar
│       ├── profile.tsx              ← Perfil (temas, navegación, logout)
│       ├── profile_partner.tsx      ← Personalidad + datos de visión ⚠️ lee campos inexistentes
│       └── profile_cycle.tsx        ← Datos del ciclo ⚠️ usa isIrregular que no existe en DB
├── components/
│   ├── AnimatedLogo.tsx
│   ├── AnimatedSpriteLogo.tsx
│   ├── CustomDatePicker.tsx
│   ├── CycleCompassHUD.tsx
│   ├── ErrorBoundary.tsx
│   ├── FireShader.tsx
│   ├── GoldShader.tsx
│   ├── MissionCard.tsx              ← HOT intensity, evidencia con ruta incorrecta
│   ├── NotificationManager.tsx
│   ├── PhaseCard.tsx
│   └── RecommendationCard.tsx       ← chips intérprete, filtro fallback visión pendiente
├── constants/
│   ├── theme.ts
│   └── themes.ts
├── context/
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── ToastContext.tsx
├── hooks/
│   ├── useAIChat.ts                 ← historial AsyncStorage, envía history a /ai/chat
│   ├── useCurrentPhase.ts
│   └── usePartnerProfile.ts
├── lib/
│   └── supabase.ts
└── services/
    ├── api.ts                       ← apiFetch (agrega /api automáticamente)
    └── storage.service.ts           ← uploadMissionPhoto (Supabase storage)
```
