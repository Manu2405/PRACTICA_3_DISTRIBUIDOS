import { Controller, Get, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';

@Controller()
export class AppController {
  // Memoria efímera para saber si un ticket ya fue escaneado
  private scannedTickets = new Map<string, boolean>();

  constructor(private readonly appService: AppService) {}

  @Get('shortest-path')
  getShortestPath(
    @Query('from') from = 'A',
    @Query('to') to = 'F'
  ) {
    return this.appService.computeShortestPath(from, to);
  }

  // --- Endpoints para la funcionalidad de Scanner Dinámico Distribuido ---

  /**
   * Endpoint que visita el teléfono celular del usuario al escanear el QR en la pantalla de la PC.
   */
  @Get('scan')
  renderMobileWallet(
    @Query('id') ticketId: string,
    @Query('d') base64Data: string,
    @Res() res: Response
  ) {
    if (!ticketId) return res.send('Ticket ID no válido');
    
    // 1. Marcar como escaneado en tiempo real (para que el frontend de la PC se entere)
    this.scannedTickets.set(ticketId, true);

    let info: any = {};
    try {
      if (base64Data) {
        info = JSON.parse(decodeURIComponent(Buffer.from(base64Data, 'base64').toString('ascii')));
      }
    } catch(e) { /* ignore */ }

    // 2. Renderizar un HTML impresionante simulando la App de Google Wallet
    // con el pase de embarque adentro e incluyendo su propio QR digital.
    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Google Wallet</title>
      <style>
        body { margin: 0; font-family: 'Google Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #1f1f1f; color: white; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
        .header { width: 100%; display: flex; align-items: center; gap: 12px; margin-bottom: 30px; }
        .gpay-logo { font-size: 22px; font-weight: 500; display: flex; align-items: center; gap: 8px;}
        .card { background-color: #e3f2fd; color: #0d47a1; border-radius: 20px; padding: 24px; width: 100%; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden; position: relative;}
        .card::before { content: ''; position: absolute; left: -10px; top: 120px; width: 20px; height: 20px; background-color: #1f1f1f; border-radius: 50%; }
        .card::after { content: ''; position: absolute; right: -10px; top: 120px; width: 20px; height: 20px; background-color: #1f1f1f; border-radius: 50%; }
        .dash { border-top: 2px dashed #90caf9; margin: 20px 0; }
        .fs-title { font-size: 14px; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; color: #1565c0; }
        .row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px;}
        .col { display: flex; flex-direction: column; }
        .city { font-size: 42px; font-weight: 800; line-height: 1;}
        .plane { font-size: 24px; transform: rotate(90deg); color: #1976d2;}
        .name { font-size: 18px; font-weight: 500; margin-top: 10px; }
        .flight { font-size: 14px; font-weight: 600; }
        .qr-box { background: white; padding: 20px; border-radius: 12px; display: flex; justify-content: center; align-items: center; flex-direction: column; width: fit-content; margin: 0 auto; }
        
        .g-btn { background-color: white; color: black; border-radius: 24px; border: none; padding: 12px 24px; font-size: 14px; font-weight: 600; margin-top: 30px; display: flex; align-items: center; gap: 8px;}
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); } 70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); } }
        
        .toast { position: fixed; bottom: 20px; background: #333; padding: 12px 20px; border-radius: 8px; font-size: 14px; opacity: 1; transition: opacity 0.5s; box-shadow: 0 4px 12px rgba(0,0,0,0.3);}
      </style>
    </head>
    <body>
      <div class="header">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48"><path fill="#fbbc04" d="M37 18H11c-2.2 0-4 1.8-4 4v16c0 2.2 1.8 4 4 4h26c2.2 0 4-1.8 4-4V22c0-2.2-1.8-4-4-4z"/><path fill="#ea4335" d="M37 18H11c-2.2 0-4 1.8-4 4v2c0-2.2 1.8-4 4-4h26c2.2 0 4 1.8 4 4v-2c0-2.2-1.8-4-4-4z"/><path fill="#34a853" d="M37 42H11c-2.2 0-4-1.8-4-4v-2c0 2.2 1.8 4 4 4h26c2.2 0 4-1.8 4-4v2c0 2.2-1.8-4-4-4z"/><path fill="#4285f4" d="M37 12H11c-2.2 0-4 1.8-4 4v6h34v-6c0-2.2-1.8-4-4-4z"/></svg>
        <span class="gpay-logo">Wallet</span>
      </div>

      <div class="card">
        <div class="fs-title">Sistemas Distribuidos Airlines</div>
        
        <div class="row">
          <div class="col"><span class="city">${info.from || 'ORIG'}</span></div>
          <div class="plane">✈</div>
          <div class="col" style="align-items: flex-end;"><span class="city">${info.to || 'DEST'}</span></div>
        </div>

        <div class="name">${info.name || 'Pasajero SARP'}</div>
        <div class="row">
          <span>Vuelo: <strong>${info.flight || 'S4-100'}</strong></span>
          <span>Clase: <strong>EJEC</strong></span>
        </div>

        <div class="dash"></div>

        <div class="row" style="margin-bottom: 24px;">
          <div class="col">
            <span style="font-size:12px; color:#1976d2">Puerta</span>
            <strong style="font-size:24px">${info.gate || 'A1'}</strong>
          </div>
          <div class="col">
            <span style="font-size:12px; color:#1976d2">Asiento</span>
            <strong style="font-size:24px">${info.seat || '12B'}</strong>
          </div>
        </div>

        <div class="qr-box">
          <!-- BARS simulando código de barras Aztec o PDF417 de avión -->
          <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="1"><path d="M4 4h16v16H4z"/><path d="M7 7h10v10H7z"/><rect x="9" y="9" width="6" height="6" fill="#111"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4 4l3 3M20 4l-3 3M4 20l3-3M20 20l-3-3"/></svg>
          <span style="margin-top: 8px; font-family: monospace; font-size:12px; color:#666">${ticketId}</span>
        </div>
      </div>

      <div class="toast pulse">
        ✅ Escaneado desde PC exitoso
      </div>

      <script>
        setTimeout(() => { document.querySelector('.toast').style.opacity = '0'; }, 5000);
      </script>
    </body>
    </html>
    `;

    res.header('Content-Type', 'text/html');
    return res.send(htmlResponse);
  }

  /**
   * Endpoint que consulta internamente la PC / Frontend para saber si el ticketId ya fue escaneado
   */
  @Get('scan/status')
  checkScanStatus(@Query('id') ticketId: string) {
    if (!ticketId) return { scanned: false };
    const isScanned = this.scannedTickets.get(ticketId) === true;
    
    // Opcional: limpiar la memoria una vez validado para evitar acumulación
    if (isScanned) {
      setTimeout(() => this.scannedTickets.delete(ticketId), 10000);
    }
    
    return { scanned: isScanned };
  }
}
