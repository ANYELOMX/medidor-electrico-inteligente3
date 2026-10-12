# Medidor Eléctrico Inteligente — V7 IA conectada

La V7 conserva la interfaz V6, Demo, Bluetooth BLE y el programa base del ESP32, y mejora la búsqueda de electrodomésticos con IA y búsqueda web. La clave API se guarda exclusivamente en el servidor, nunca en el navegador.

## Requisitos
- Node.js 20 o superior.
- Una clave de API de OpenAI con acceso y cuota habilitados. Una suscripción de ChatGPT por sí sola no incluye automáticamente crédito para la API; la API se factura por separado.
- Conexión a internet para consultar la IA y las fuentes web.

## Activar la IA (paso obligatorio)
1. Descomprime el ZIP en una carpeta sencilla, por ejemplo `C:\\MedidorV7`.
2. Abre esa carpeta y copia `.env.example`; cambia el nombre de la copia a `.env` (sin `.txt`).
3. Edita `.env` con el Bloc de notas y reemplaza `pega_tu_clave_api_aqui` por tu clave API real:

   ```env
   OPENAI_API_KEY=tu_clave_api_real
   OPENAI_MODEL=gpt-4.1-mini
   PORT=3000
   ```

   Si el modelo no está habilitado para tu cuenta, cambia `OPENAI_MODEL` por otro modelo disponible en tu proyecto de API. No compartas la clave ni la subas a GitHub.
4. Abre una terminal en esa carpeta y ejecuta:

   ```bash
   npm install
   npm start
   ```
5. Abre Chrome o Edge en `http://localhost:3000`.
6. En el panel de IA, confirma que indique **IA conectada**. Escribe marca y modelo, por ejemplo `refrigerador marca y modelo`, y pulsa **Buscar y comparar**.

La plataforma buscará datos técnicos en la web y mostrará potencia de referencia, comparación, diagnóstico prudente y enlaces de fuentes cuando estén disponibles. Si aparece un error, el panel explica la causa probable:
- **401**: clave incorrecta.
- **429**: sin cuota/límite de API; revisa facturación y límites del proyecto.
- **Modelo no disponible**: cambia `OPENAI_MODEL` por uno habilitado.

## Demostración y medición real
- **Demo** genera datos simulados para probar la interfaz. El resultado de IA advierte que no es una medición real.
- Para datos reales, carga `esp32_pzem_ble.ino` al ESP32 y conecta mediante el botón Bluetooth desde Chrome/Edge. Web Bluetooth requiere HTTPS o `localhost`.
- Conexión prevista: red eléctrica → PZEM-004T → ESP32 → BLE → navegador.

## Publicar en internet
GitHub Pages solo sirve archivos estáticos y no puede ejecutar `server.js`. Para usar IA desde una web publicada, despliega esta carpeta completa en un hosting compatible con Node.js y configura `OPENAI_API_KEY`, `OPENAI_MODEL` y `PORT` como variables de entorno privadas del hosting. La página debe servirse por HTTPS para Bluetooth.

## Seguridad eléctrica
El PZEM-004T trabaja con tensiones peligrosas. Instala el módulo dentro de una caja aislante con protección apropiada. No manipules conductores de red energizados.
