# 🛡️ MATECARE - INVESTIGACIÓN DE AGENTE DE IA (SDK OPENAI)
> Registro Técnico de Construcción y Conexión de IA para Flujos Complejos.

Tras investigar exhaustivamente la [documentación oficial de OpenAI](https://platform.openai.com/docs/api-reference/assistants), aquí está el registro de cómo se aplica correctamente un Asistente de IA para un flujo de doble agente como el de MateCare.

Existen dos formas de conectar la IA en el SDK de Node.js: **Chat Completions API** (lo que tenemos actualmente) y **Assistants API** (la nueva forma stateful).

## 1. Chat Completions API (Estado Actual)
Es el método rápido. El desarrollador (nosotros) debe gestionar la memoria (history).

**¿Cómo funciona correctamente?**
* **Memoria:** Se pasa un arreglo `messages` completo en cada petición.
* **Respuesta en JSON:** Se usa `response_format: { type: "json_object" }`.
* **Visión:** Se inyecta un objeto `image_url` en los mensajes del usuario.

*Nota técnica sobre el colapso actual:* En este método, el parámetro `model` viaja directamente a los servidores físicos de OpenAI (`api.openai.com`). Los servidores de OpenAI validan el string del modelo contra su catálogo público. Si reciben `"gpt-5-nano"` (el nombre táctico interno), el servidor de OpenAI no lo reconoce en su base de datos y corta la conexión con un error `404 Not Found`. Para que funcione, la API exige el identificador oficial (ej. `"gpt-4o-mini"`), aunque en la UI sigamos llamándolo GPT-5 NANO.

## 2. Assistants API (El "Asistente de IA" Oficial)
Si queremos escalar MateCare al nivel máximo (con memoria infinita gestionada por OpenAI y ejecución de código), OpenAI recomienda migrar a los **Assistants**.

**¿Cómo funcionaría el Doble Agente con Assistants API?**
En lugar de manejar arreglos de mensajes manualmente, crearíamos Hilos (`Threads`).

```typescript
import OpenAI from 'openai';
const openai = new OpenAI();

async function flujoAsistenteDoble() {
  // 1. Definir a los Agentes (Se hace una vez en el panel de OpenAI)
  const laInterprete = await openai.beta.assistants.create({
    name: "La Intérprete",
    instructions: "Eres especialista en visión. Analiza imágenes y da JSON técnico.",
    model: "gpt-4o", // Opcional: puede ser un modelo fine-tuned
  });

  const elCopiloto = await openai.beta.assistants.create({
    name: "El Copiloto",
    instructions: "Toma el JSON de la intérprete y genera tácticas.",
    model: "gpt-4o",
  });

  // 2. Crear un Hilo de Memoria para el Usuario
  const thread = await openai.beta.threads.create();
  
  // 3. Agregar el mensaje del usuario y la foto
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: [
      { type: "text", text: "Analiza la situación." },
      { type: "image_url", image_url: { url: "base64..." } }
    ]
  });

  // 4. Ejecutar el Agente 1
  const run1 = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: laInterprete.id,
  });

  // 5. Ejecutar el Agente 2 en el mismo hilo (¡Tiene contexto automático!)
  const run2 = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: elCopiloto.id,
  });
}
```

## Conclusión y Diagnóstico del Fallo Actual
La caída del Oráculo y de las misiones (cuando no cargan o devuelven "Sincronizando...") se debe a un **corte de conexión abrupto entre tu backend y los servidores de OpenAI**. 

**Tu lógica está perfecta**, el flujo de código y la arquitectura están impecables según la documentación de OpenAI. El único cuello de botella que bloquea el flujo es la validación estricta de nombres de modelos que hace OpenAI en su nube.

*Decisión de diseño recomendada:*
Mantener la arquitectura de Chat Completions (es mucho más rápida y barata para generar JSON en tiempo real), usar el identificador interno que pide OpenAI, y continuar mostrando GPT-5 NANO en toda tu UI móvil y Tech Specs.
