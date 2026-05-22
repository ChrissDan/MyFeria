import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Obtener todos los platos ordenados alfabéticamente
    const [rows] = await pool.query('SELECT id, nombre FROM platos ORDER BY nombre ASC');
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}