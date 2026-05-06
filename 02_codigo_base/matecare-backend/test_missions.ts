import { generarMisionesTactica } from './src/services/aiClient.service';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  console.log("--- TEST DE GENERACIÓN DE MISIONES ---");
  try {
    const res = await generarMisionesTactica({ phase: "OVULATION" });
    console.log("Misiones generadas:");
    console.log(JSON.stringify(res, null, 2));
  } catch (error: any) {
    console.error("ERROR DETECTADO:");
    console.error(error.message);
  }
}

test();
