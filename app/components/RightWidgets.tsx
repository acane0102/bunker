/// @ts-nocheck/ 1. Clasificación de trades
// @ts-nocheck  

const wins = filteredTrades.filter((t: any) => ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)) > 0);
  const losses = filteredTrades.filter((t: any) => ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)) < 0);
  const bes = filteredTrades.filter((t: any) => ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)) === 0);

  // 2. Win Rate
  const totalTrades = filteredTrades.length;
  const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;

  // 3. Promedios y Profit Factor
  const grossWin = wins.reduce((acc: number, t: any) => acc + ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)), 0);
  const grossLoss = Math.abs(losses.reduce((acc: number, t: any) => acc + ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0)), 0));

  const avgWin = wins.length > 0 ? (grossWin / wins.length).toFixed(2) : "0.00";
  const avgLoss = losses.length > 0 ? (grossLoss / losses.length).toFixed(2) : "0.00";

  const profitFactor = grossLoss === 0 
    ? (grossWin > 0 ? grossWin.toFixed(2) : "0.00") 
    : (grossWin / grossLoss).toFixed(2);

  // 4. Drawdown y Racha (Streak) Dinámicos
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let streakType = 'NONE';
  let streakCount = 0;

  // Ordenamos cronológicamente para simular la racha real
  const sortedTrades = [...filteredTrades].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  sortedTrades.forEach((t: any) => {
    const net = (Number(t.rr_achieved) || 0) - (Number(t.commission) || 0);
    
    // Calcular Drawdown
    if (net < 0) {
      currentDrawdown += Math.abs(net);
      if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;
    } else if (net > 0) {
      currentDrawdown = 0; // Se resetea la caída al ganar
    }

    // Calcular Racha (Streak)
    if (net > 0) {
      if (streakType === 'WINS') streakCount++;
      else { streakType = 'WINS'; streakCount = 1; }
    } else if (net < 0) {
      if (streakType === 'LOSSES') streakCount++;
      else { streakType = 'LOSSES'; streakCount = 1; }
    } else {
      streakType = 'BE';
      streakCount = 1;
    }
  });

  const currentStreak = { type: streakType, count: streakCount };