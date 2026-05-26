import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('inicio') || '2026-05-15';
    const fechaFin = searchParams.get('fin') || '2026-06-10';

    // Modificamos la consulta para normalizar la cantidad dividiendo entre 5
    // Fórmula: (Cantidad para 5 personas / 5) * Personas Reales
    const query = `
      SELECT 
          i.nombre AS ingrediente,
          SUM((r.cantidad_base / 5) * p.nro_personas) AS totalNecesario,
          i.stock_actual AS enDespensa,
          GREATEST(0, SUM((r.cantidad_base / 5) * p.nro_personas) - i.stock_actual) AS cantidadAComprar,
          i.unidad_medida AS unidad
      FROM planificador p
      JOIN recetas r ON p.plato_id = r.plato_id
      JOIN ingredientes i ON r.ingrediente_id = i.id
      WHERE p.fecha BETWEEN ? AND ?
      GROUP BY i.id, i.nombre, i.stock_actual, i.unidad_medida;
    `;

    const [rows] = await pool.query(query, [fechaInicio, fechaFin]);
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}