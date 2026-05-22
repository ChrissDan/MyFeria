import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// 1. GET: Obtener el menú planificado en un rango de fechas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');

    if (!inicio || !fin) {
      return NextResponse.json({ error: 'Faltan las fechas de inicio y fin' }, { status: 400 });
    }

    const query = `
      SELECT id, DATE_FORMAT(fecha, '%Y-%m-%d') as fecha, plato_id, nro_personas 
      FROM planificador 
      WHERE fecha BETWEEN ? AND ?
      ORDER BY fecha ASC
    `;
    
    const [rows] = await pool.query(query, [inicio, fin]);
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Guardar o Actualizar el plato de un día específico
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fecha, plato_id, nro_personas } = body;

    if (!fecha || !nro_personas) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Usamos la propiedad de MySQL 'ON DUPLICATE KEY UPDATE' o una verificación manual.
    // Como en TiDB el planificador tiene un ID autoincremental, verificamos si ya existe la fecha.
    const [existe]: any = await pool.query('SELECT id FROM planificador WHERE fecha = ?', [fecha]);

    if (existe.length > 0) {
      if (plato_id === null || plato_id === '') {
        // Si el usuario selecciona "Ninguno/Vacío", eliminamos el registro de ese día
        await pool.query('DELETE FROM planificador WHERE fecha = ?', [fecha]);
        return NextResponse.json({ message: 'Día liberado' });
      } else {
        // Si ya existe la fecha, actualizamos el plato y las personas
        await pool.query(
          'UPDATE planificador SET plato_id = ?, nro_personas = ? WHERE fecha = ?',
          [plato_id, nro_personas, fecha]
        );
        return NextResponse.json({ message: 'Planificación actualizada' });
      }
    } else {
      // Si la fecha no existe y viene un plato válido, insertamos un nuevo registro
      if (plato_id) {
        await pool.query(
          'INSERT INTO planificador (fecha, plato_id, nro_personas) VALUES (?, ?, ?)',
          [fecha, plato_id, nro_personas]
        );
        return NextResponse.json({ message: 'Día planificado con éxito' });
      }
    }

    return NextResponse.json({ message: 'No se realizaron cambios' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}