(function (global) {
  const lib = global.GTOAT_SLITHER_LIB = global.GTOAT_SLITHER_LIB || {};

  function updateBots(world, hashes, dt) {
    for (let i = 0; i < world.snakes.length; i++) {
      const snake = world.snakes[i];
      if (!snake.alive || snake.isPlayer) continue;
      if (snake.aiState) snake.aiState.passive = false;
      lib.BotAI.updateBotDecision(snake, world, hashes, dt);
    }
  }

  lib.Bots = { updateBots };
})(typeof window !== 'undefined' ? window : globalThis);
