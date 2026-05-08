# Guía Visual: Temas y Colores de MateCare

Esta guía describe los tokens de diseño y paletas cromáticas utilizadas en la Galería UI v2. MateCare utiliza un sistema de temas dinámicos que cambian no solo los colores, sino también los iconos, emojis y estilos de animación.

## 🎨 Paletas de Colores por Tema

### 🌿 1. NEVERLAND (Bosque Orgánico) - Default
*El tema base de la aplicación, inspirado en la naturaleza y la elegancia clásica.*
- **Fondo:** `#044422` (Verde Bosque Profundo)
- **Acento (Oro):** `#CFAA3C`
- **Secundario:** `#B8860B`
- **Vibe:** Orgánico, confiable, sereno.

### 🔮 2. ETHEREAL (Misterio Etéreo)
*Inspirado en la intuición y el misterio.*
- **Fondo:** `#20303D` (Azul Noche)
- **Acento:** `#D698CA` (Rosa Lavanda)
- **Secundario:** `#E8CBA0` (Arena)
- **Vibe:** Místico, suave, profundo.

### 🐉 3. DRAGON (Ruleta de Fuego)
*Diseñado para la energía alta y la intensidad.*
- **Fondo:** `#2B2B2A` (Gris Carbón)
- **Acento:** `#FF7500` (Naranja Fuego)
- **Secundario:** `#B62203` (Rojo Sangre)
- **Vibe:** Agresivo, energético, pasional.

### 💻 4. CYBER (Hacker / Jarvis)
*Estética futurista y tecnológica.*
- **Fondo:** `#020021` (Azul Cibernético)
- **Acento:** `#FC0FF5` (Magenta Neón)
- **Secundario:** `#00AEFF` (Cian Eléctrico)
- **Vibe:** Futurista, analítico, frío.

---

## 📅 Colores por Fase del Ciclo
Independientemente del tema, el sistema utiliza colores específicos para identificar la fase del ciclo en los indicadores y el calendario:

| Fase | Color (NEVERLAND) | Significado Visual |
|---|---|---|
| **Menstrual** | `#FF4444` | Alerta / Cuidado |
| **Folicular** | `#CFAA3C` | Energía / Crecimiento |
| **Ovulación** | `#4CAF50` | Apertura / Pico |
| **Lútea** | `#B8860B` | Preparación / Calma |

---

## ✍️ Tipografía Premium
- **Títulos:** `OpenSans-Bold` (Peso 800)
- **Cuerpo:** `OpenSans-Regular` (Legibilidad máxima)
- **Botones:** `OpenSans-Bold` (Con espaciado de letras ampliado)

---

## ✨ Efectos Visuales
- **Glassmorphism:** Todas las tarjetas usan fondos `rgba(255, 255, 255, 0.08)` con desenfoque de fondo (*Blur*).
- **Glow Effects:** Los elementos activos emiten un brillo suave del color de acento.
- **Gradientes:** Se utiliza un gradiente de 3 puntos para los elementos dorados: `['#8f6B29', '#FDE08D', '#DF9F28']`.

> [!TIP]
> Para mantener la consistencia en el desarrollo, usa siempre el hook `useTheme()` que inyecta estos tokens automáticamente según la selección del usuario.
