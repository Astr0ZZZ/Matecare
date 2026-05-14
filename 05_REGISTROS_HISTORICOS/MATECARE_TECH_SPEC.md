# 🛡️ MATECARE TACTICAL DOSSIER v5.2 - ESPECIFICACIÓN MAESTRA (GPT-5 NANO)
## Documentación de Ingeniería de Alta Fidelidad

Este documento es la fuente de verdad única para el ecosistema MateCare. La arquitectura se basa en la **Sincronización Unificada**, evitando la creación de micro-servicios redundantes.

---

### 1. ARQUITECTURA DE IA: SISTEMA DE DOBLE AGENTE
MateCare opera bajo una estructura de dos etapas en `ai.service.ts` para garantizar precisión y tono masculino táctico.

#### 1.1 Agente 1: La Intérprete (Análisis Profundo)
*   **Modelo**: GPT-4o-Mini (Capacidad de Visión).
*   **Función**: Decodifica biología (ciclo), psicología (MBTI/Apego) y visión (fotos).
*   **Salida**: JSON estructurado con `real_state`, `sexual_mood`, `hidden_need` y `style_analysis`.

#### 1.2 Agente 2: El Copiloto (Acción Táctica)
*   **Modelo**: GPT-5 NANO (Lógica de Decisión).
*   **Función**: Transforma el análisis del Agente 1 en consejos directos y misiones.
*   **Salida**: JSON con `response` (Consejo del Oráculo) y `missions` (Edictos Tácticos).

---

### 2. VISIÓN TÁCTICA Y PERSISTENCIA
El sistema de visión ya no depende de scripts locales pesados.

*   **Flujo de Imagen**: App -> Base64 -> `runUnifiedTacticalAI` -> Análisis Visual GPT.
*   **Persistencia Visual**: 
    *   `lastVisionDescription`: Descripción humana de la última foto.
    *   `visualStyle`: Etiqueta técnica (ej. "Elegant / Dinner").
*   **Memoria Visual**: Los consejos del Dashboard integran la última foto analizada para dar contexto persistente.

---

### 3. EDICTOS TÁCTICOS (MISIONES)
Las misiones se dividen por intensidad para guiar la interacción del usuario.

*   **Categorías**: PHYSICAL, ROMANTIC, QUALITY, GIFT, ACTS.
*   **Intensidad `HOT` (Misión Roja)**: 
    *   **Trigger**: Se activa en categorías ROMANTIC o cuando la IA detecta tensión sexual.
    *   **Visual**: Renderizado con `backgroundColor: rgba(255, 30, 30, 0.25)` y borde vibrante.
*   **Intensidad `NORMAL`**: Renderizado con el tema estándar del usuario.

---

### 4. COMPONENTES CLAVE Y UI (MATECARE-MOBILE)

*   **`RecommendationCard.tsx`**: 
    *   Muestra el "Oráculo" con chips dinámicos de humor y necesidad.
    *   Incluye la "Lectura Táctica" (Análisis Visual) solo si hay datos recientes.
*   **`MissionCard.tsx`**:
    *   Detecta `intensity === 'HOT'` para aplicar el estilo de "Alerta Roja".
*   **`Dashboard index.tsx`**:
    *   Implementa **Polling Suave** (5s) cuando la IA está generando un nuevo reporte en background.

---

### 5. REGLAS DE ORO PARA MANTENER EL CÓDIGO LIMPIO

1.  **Cero Narrativas Redundantes**: No crear nuevos controladores si la lógica puede ser absorbida por el sistema de Doble Agente.
2.  **Limpieza de Saludos**: Todas las respuestas pasan por `cleanTacticalResponse` para eliminar saludos genéricos o robóticos.
3.  **Prioridad de Contexto**: La IA siempre debe recibir el perfil completo (MBTI + Ciclo + Visión) antes de hablar.
4.  **Nombramiento Estricto**: Usar siempre `GPT-5 NANO` en el branding visual del frontend para mantener la estética premium.

---

### 6. GLOSARIO TÉCNICO V5.2
*   **`interpreter`**: Objeto de análisis psicológico/emocional del Agente 1.
*   **`style_analysis`**: Descripción visual generada por IA tras procesar una imagen.
*   **`adviceUpdatedAt`**: Timestamp que controla la frescura de los consejos en el Dashboard.
