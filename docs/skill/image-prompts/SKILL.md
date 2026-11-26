---
name: image-prompts
description: Inspecciona un proyecto y crea prompts compactos para generar sus imágenes en ChatGPT, una por una, organizadas en lotes autosuficientes de máximo 7. Siempre deja además el .md en el repo y entrega las versiones HTML (móvil, con botón copiar) y PDF. Úsala cuando el usuario pida preparar, crear, reemplazar, planear o generar imágenes, fotografías, assets visuales, hero images, imágenes de proyectos, productos, servicios, blog o placeholders.
argument-hint: "[sección, página o instrucciones opcionales]"
---

# Image Prompt Batches

Prepara prompts finales para que el usuario los copie directamente en ChatGPT y
genere las imágenes necesarias para el proyecto.

Solicitud adicional del usuario:

$ARGUMENTS

## Paso 1: inspeccionar el proyecto

Antes de escribir los prompts:

1. Inspecciona el código, componentes, datos y assets existentes.
2. Identifica todas las imágenes solicitadas o faltantes.
3. Localiza las rutas y nombres de archivo que espera el código.
4. Revisa las imágenes existentes que definan el estilo visual del proyecto.
5. Determina la relación de aspecto, orientación, formato y composición apropiados.
6. Considera overlays, textos, botones o elementos que el sitio coloque encima.
7. No inventes rutas diferentes cuando el código ya establezca una.
8. No modifiques código, crees placeholders ni hagas commits, salvo que el usuario
   lo solicite expresamente. Esta skill produce los prompts, no implementa imágenes.
   **Única excepción:** siempre debes crear los archivos de entrega del Paso 4
   (`.md`, `.html` y `.pdf` de los prompts); eso no cuenta como modificar código.
9. Obtén el **nombre del proyecto** (package.json, README, título del sitio o lo que
   diga el usuario). Se usa en el nombre de cada conversación: «Batch X/N - Nombre».

Si no puedes determinar una ruta, propón una consistente con la estructura actual.

## Paso 2: dividir en lotes

Divide todas las imágenes en lotes de máximo 7.

Ejemplos:

- 1–7 imágenes: un lote.
- 8–14 imágenes: dos lotes.
- 15–21 imágenes: tres lotes.

Cada lote debe ser completamente autosuficiente porque el usuario lo pegará en un
chat nuevo.

En cada lote:

- reinicia la numeración desde IMAGEN 1;
- menciona la cantidad real de imágenes;
- repite el contexto y estilo visual completos;
- empieza pidiendo que la conversación se llame «Batch [n]/[total] - [Nombre del proyecto]»;
- incluye la REGLA OBLIGATORIA de nombre y ruta de cada imagen (ver Paso 3);
- indica que se generarán una por una;
- ordena esperar a que el usuario escriba “siguiente”.

## Paso 3: formato obligatorio

Entrega cada lote dentro de un único bloque de código listo para copiar.

Fuera del bloque escribe únicamente:

LOTE [n] DE [total]

El contenido debe seguir exactamente esta estructura:

PRIMERO, antes de hacer cualquier otra cosa: esta conversación debe llamarse
exactamente «Batch [n]/[total] - [Nombre del proyecto]». Renómbrala (o titúlala) así
ahora mismo. Si no puedes renombrarla tú mismo, escribe en tu primera respuesta: «Por
favor renombra esta conversación como: Batch [n]/[total] - [Nombre del proyecto]».

Vas a generar [cantidad] imágenes para [descripción breve del proyecto]. Te voy a dar
las [cantidad] descripciones de una vez, pero quiero que las generes de UNA EN UNA:
genera solo la primera ahora y espera. Cuando yo escriba "siguiente", genera la imagen
2, y así sucesivamente hasta terminar las [cantidad]. No generes más de una imagen por
turno.

REGLA OBLIGATORIA, MUY IMPORTANTE — NOMBRE Y RUTA DE CADA IMAGEN: cada imagen tiene un
archivo con su ruta exacta (la línea «archivo:»). CADA VEZ que me entregues una imagen,
tu mensaje DEBE incluir, justo encima o justo debajo de la imagen, esta línea copiada
letra por letra de la lista: «Archivo: <ruta completa/nombre.ext>» (por ejemplo,
«Archivo: [ruta de ejemplo real del proyecto]»). Nunca entregues una imagen sin su
nombre y su ruta. No abrevies la ruta, no la cambies, no la traduzcas, no inventes otro
nombre y no la omitas aunque la imagen sea parecida a otra. Si alguna vez olvidas poner
el nombre y la ruta, yo te lo recordaré y deberás repetir el mensaje con la línea
«Archivo: …» correcta. Antes de enviar cada respuesta, verifica que la línea
«Archivo: …» está presente.

Estilo visual que deben compartir las [cantidad] (aplícalo a todas): [un solo párrafo
compacto con el estilo compartido, paleta, iluminación, realismo, composición,
relación de aspecto, restricciones y elementos prohibidos].

IMAGEN 1 — archivo: [ruta exacta/nombre.ext]
(Al entregarla escribe: «Archivo: [ruta exacta/nombre.ext]»). Formato [relación] ([ancho]×[alto] px). [Descripción visual completa y compacta.]

IMAGEN 2 — archivo: [ruta exacta/nombre.ext]
(Al entregarla escribe: «Archivo: [ruta exacta/nombre.ext]»). Formato [relación] ([ancho]×[alto] px). [Descripción visual completa y compacta.]

[Continuar hasta terminar el lote.]

Recuerda: en cada imagen que me entregues, incluye siempre la línea «Archivo: <ruta
completa/nombre.ext>» de la lista.
Empieza generando solo la IMAGEN 1 (incluyendo su línea «Archivo: …») y espera mi "siguiente".

Notas del formato:

- `[n]` y `[total]` son el número de lote y el total (Batch 1/6, 2/6…). El nombre de
  conversación es literalmente «Batch n/total - Nombre del proyecto».
- Estas reglas (nombre de conversación y REGLA OBLIGATORIA) van dentro de **cada** lote,
  sin excepción, porque cada lote se pega en un chat nuevo.
- Las líneas «(Al entregarla escribe: …)», «Recuerda: …» y el cierre forman parte del
  formato y NO se consideran explicaciones prohibidas.

## Paso 4: entrega en archivos (siempre)

Además de mostrar los bloques en el chat, SIEMPRE entrega los prompts como archivos:

1. **Guarda el `.md` en el repo**: `docs/IMAGE_PROMPTS.md` (o la carpeta de docs que ya
   use el proyecto). Estructura del archivo:
   - un título `# [Nombre del proyecto] — Prompts de imágenes` y una línea con el número
     de lotes e imágenes;
   - luego, por cada lote, el rótulo `LOTE [n] DE [total]` seguido del bloque de código
     (tres comillas invertidas) con el contenido exacto del Paso 3.
   El `.md` debe contener exactamente el mismo texto de los bloques que mostraste.
2. **Genera el HTML (móvil) y el PDF idénticos** con el script incluido en esta skill
   (misma plantilla siempre; no inventes otra):

   ```bash
   node <carpeta-de-esta-skill>/build-prompt-docs.mjs docs/IMAGE_PROMPTS.md --project "[Nombre del proyecto]"
   ```

   Produce `docs/IMAGE_PROMPTS.html` (página para móvil con botón **Copiar lote** por
   cada lote, funciona sin conexión) y `docs/IMAGE_PROMPTS.pdf` (formato estrecho para
   leer en el teléfono). El PDF usa Playwright/Chromium; si no está disponible, entrega
   el HTML y dilo explícitamente.
3. **Entrega los dos archivos al usuario** para que los descargue (herramienta de envío
   de archivos si existe, p. ej. `SendUserFile` con `display: "attach"`): el `.html`
   (recomendado en móvil) y el `.pdf` (respaldo). Indica brevemente cuál usar.
4. No hagas commit ni push salvo que el usuario lo pida o el flujo del repo lo exija.

## Reglas estrictas de salida

La respuesta debe parecer un prompt escrito directamente para un generador de
imágenes. No debe parecer documentación técnica.

NO incluyas secciones como:

- Contexto del proyecto
- Guía visual compartida
- Especificaciones técnicas
- Utilizada en
- Texto alternativo
- Resolución recomendada
- Prompt
- Fin del lote
- Instrucciones para guardar los archivos (dentro de los bloques)

NO produzcas fichas técnicas individuales.

NO coloques cada descripción dentro de un campo llamado “Prompt”. La descripción
debajo de cada IMAGEN ya es el prompt.

NO repitas en cada imagen las características visuales que ya aparecen en el párrafo
de estilo compartido.

NO agregues análisis, explicaciones, resúmenes, instrucciones de implementación ni
comentarios después de los bloques. (Excepción: la breve entrega de archivos del
Paso 4 — qué archivos son y cuál usar en móvil.)

## Rutas

La línea `archivo:` debe incluir la ruta completa relativa al proyecto, no solamente
el filename.

Correcto:

IMAGEN 1 — archivo: public/images/blog/article-cover.png

Incorrecto:

IMAGEN 1 — archivo: article-cover.png

Respeta exactamente carpetas, mayúsculas, minúsculas, guiones y extensión.

## Calidad de los prompts

Cada descripción debe especificar únicamente lo particular de esa imagen:

- sujeto;
- escenario;
- acción;
- encuadre especial;
- posición relevante;
- texto visible, solamente cuando sea verdaderamente necesario.

Mantén las descripciones suficientemente detalladas para obtener consistencia, pero
compactas. Toda indicación común pertenece exclusivamente al párrafo de estilo.

## Verificación final

Antes de responder, confirma internamente que:

1. Ningún lote contiene más de 7 imágenes.
2. Cada lote funciona por separado.
3. Cada lote reinicia en IMAGEN 1.
4. Cada imagen tiene su ruta exacta.
5. Cada bloque termina ordenando generar solamente la primera imagen.
6. La salida puede copiarse directamente sin editarla.
7. No añadiste fichas técnicas ni explicaciones innecesarias.
8. Cada lote empieza pidiendo la conversación «Batch n/total - Nombre del proyecto».
9. Cada lote incluye la REGLA OBLIGATORIA de «Archivo: <ruta>» y su recordatorio final;
   cada IMAGEN lleva su línea «(Al entregarla escribe: «Archivo: …»)».
10. Dejaste `docs/IMAGE_PROMPTS.md` en el repo, generaste el `.html` y el `.pdf` con el
    script, y entregaste ambos al usuario.