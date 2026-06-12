# Distribuidora Marini - Sistema de Catálogo y Pedidos Mayoristas

Una aplicación web diseñada específicamente para una distribuidora de fiambres y lácteos. Este sistema permite a los comercios mayoristas o minoristas consultar el stock en tiempo real y realizar pedidos a través de WhatsApp.

Además, cuenta con un panel de administración restringido y blindado para la gestión del catálogo, precios y control de clientes habilitados.

---

## 🚀 Características Principales

### 📱 Experiencia del Cliente (Frontend)
* **Autenticación por numero de cliente:** Acceso rápido y simplificado sin contraseñas engorrosas, ideal para el flujo diario de almacenes y fiambrerías.
* **Precios Dinámicos por Volumen:** El catálogo renderiza automáticamente los precios de la **Lista 1, 2 o 3** según el perfil que el administrador le haya asignado al comercio en la base de datos.
* **Módulo de invitados(no clientes):** Permite el ingreso a usuarios nuevos (Lista 3) exigiéndoles datos de contacto (nombre, dirección, teléfono) únicamente al momento de pasar por el checkout.
* **Carrito de Compras Optimizado:** Control de cantidades por Kilo, Horma o Unidad, con cálculo estimado del total sujeto a balanza.
* **Integración con WhatsApp:** Envío automatizado del pedido con formato profesional y limpio directo al chat de la distribuidora.

### ⚙️ Panel de Control (Administración)
* **Acceso Seguro (Supabase Auth):** Panel blindado bajo inicio de sesión con correo y contraseña exclusivos para el dueño del negocio.
* **Gestión de Catálogo en Tiempo Real:** Alta, edición, baja y pausa de stock inmediato de productos con asignación paralela para las tres listas de precios mayoristas.
* **Control de Clientes:** Altas y bajas de comercios adheridos y re-asignación de tarifas de precios con un solo clic.
* **Interfaz Autoadaptable (Responsive UI):** Menús y modales adaptados mediante lógica de hamburguesa para que el dueño opere el negocio cómodamente desde su celular con datos móviles.

---

## 🛠️ Stack Tecnológico

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
* **Lenguaje:** [TypeScript](https://www.typescript.org/) (Tipado estricto libre de `any`)
* **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
* **Base de Datos & Seguridad:** [Supabase](https://supabase.com/) (PostgreSQL)
* **Seguridad de Datos:** Row Level Security (RLS) policies en Postgres para blindar escrituras públicas.

---

## 🔒 Arquitectura de Seguridad (RLS)

Para garantizar la integridad del negocio frente a inspecciones maliciosas en el cliente, la base de datos implementa las siguientes directivas de seguridad a nivel de fila:

* **Tabla `productos` & `clientes` (SELECT):** Acceso público (`anon`) y autenticado, permitiendo que la app valide códigos y renderice el catálogo sin trabas.
* **Tabla `productos` & `clientes` (INSERT, UPDATE, DELETE):** Restringido exclusivamente al rol `authenticated`. Cualquier petición de modificación externa es rechazada en milisegundos por el motor de Supabase si no proviene de la sesión del administrador.

---
