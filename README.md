# Gastos

App minimalista de control de gastos personales. Funciona 100% en el navegador, sin servidor ni base de datos: los datos quedan guardados en tu celular.

## Qué hace

- **Cargar un gasto en 4 toques**: botón `+` → monto → categoría → cómo lo pagaste → Guardar.
- **Medio de pago**: Efectivo, Mercado Pago, Débito o Tarjeta. Arranca con el último que usaste; Inicio muestra el total por medio y, tocándolo, qué se pagó así (ej: todo lo que viene en el resumen de la tarjeta).
- **Categorías** con emoji (se agregan, se editan —nombre y emoji— o se quitan desde Ajustes): Súper, Salir a comer, Café, Transporte, Regalos, Ocio, Ropa, Salud, Hogar, Servicios, Suscripción, Gym, Viajes, Mascotas, Educación, Otros.
- **Caja**: contás una vez cuánto tenés en efectivo, Mercado Pago y banco, y cuánto debés de tarjeta. Desde ahí se actualiza sola: los gastos en efectivo, MP o débito bajan la plata líquida; los de tarjeta suman a "Tarjeta a pagar" y recién bajan la plata cuando registrás el pago de la tarjeta. También anotás la plata que te entra (ej: sueldo) y los pases entre cuentas (ej: sacar del cajero). Los fijos cuentan cuando los marcás pagados.
- **Euros**: en Ajustes → Moneda se elige Pesos o Euros. En euros los montos se ven como `1.234,50 €`, los medios de pago son Efectivo, Bizum, Débito y Tarjeta, la caja tiene Efectivo y Banco, y no hay gastos en dólares. Un link con `?moneda=EUR` (ej: `https://ttthez.github.io/gastos/?moneda=EUR`) abre la app ya en euros la primera vez.
- **Gastos fijos** (gym, Netflix, alquiler…): se cargan una vez y se suman solos todos los meses. Podés marcar cuáles ya pagaste en el mes.
- **Resumen mensual**: total, variables vs. fijos y barras por categoría. Cambiás de mes con las flechas.
- **Tocá un gasto** para editarlo o eliminarlo.
- **Copia de seguridad**: exportar/importar JSON y exportar el mes a CSV (abre en Excel / Google Sheets).
- Se instala como app en el celular y funciona sin internet.

## Publicarla gratis con GitHub Pages

1. Creá un repo nuevo en GitHub (por ejemplo `gastos`) y subí estos archivos:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/gastos.git
   git push -u origin main
   ```
   (O desde la web: *Add file → Upload files* y arrastrás todo.)
2. En el repo: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. En 1–2 minutos queda en `https://TU-USUARIO.github.io/gastos/`.

## Instalarla en el celular

- **iPhone (Safari)**: abrí el link → botón Compartir → *Agregar a pantalla de inicio*.
- **Android (Chrome)**: abrí el link → menú ⋮ → *Instalar app* / *Agregar a pantalla principal*.

## Importante sobre tus datos

Los gastos se guardan en el almacenamiento local del navegador de **ese** dispositivo. No se sincronizan entre celular y compu, y si borrás los datos del navegador se pierden. Usá **Ajustes → Exportar copia** cada tanto.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | Estructura de la app |
| `style.css` | Estilos (modo claro y oscuro automático) |
| `app.js` | Lógica: gastos, fijos, categorías, resumen |
| `sw.js`, `manifest.json`, `icon*` | Para instalarla y usarla offline |

Las categorías se agregan o quitan desde **Ajustes → Categorías**. `CATEGORIAS`, al principio de `app.js`, es la lista de fábrica.
