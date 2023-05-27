function testarConexaoNgrok(urlNgrok) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', urlNgrok);
    request.onload = function() {
      if (request.status === 200) {
        resolve();
      } else {
        reject();
      }
    };
    request.onerror = function() {
      reject();
    };
    request.send();
  });
}

// Função para alterar o conteúdo do elemento HTML
function alterarConteudoElemento(display, texto) {
  document.querySelector('.loader').style.display = ''+display ;
  const elemento = document.getElementById('load');
  if (elemento) {
    elemento.innerHTML = '<div class="waiting-for-player"> <h2>'+ texto +'</h2> <div class="loader"></div> </div> ';
  }
}

// Link do Ngrok que será testado
const linkNgrok = 'https://36bb-177-89-225-229.ngrok-free.app/';

// Testar a conexão com o link Ngrok
testarConexaoNgrok(linkNgrok)
  .then(() => {
    console.log('Conexão com Ngrok estabelecida');
    alterarConteudoElemento('block','Aguardando outro jogador...');
  })
  .catch(() => {
    console.log('Falha na conexão com Ngrok');
    alterarConteudoElemento('none','Servidor não disponível');
  });

const socket = io.connect(linkNgrok);
console.log(socket);
var initGame = false;
const canvas = document.getElementById('canvas-jogo');
const context = canvas.getContext('2d');

const larguraRaquete = 2; 
const alturaRaquete = 40; 
let playerY = canvas.height / 2 - alturaRaquete / 2; 
var opponentY = canvas.height / 2 - alturaRaquete / 2; 

let playerMoveUp = false;
let playerMoveDown = false;
var myPlayerString;
var myPlayer;
var oponentePlayer;
var pontoPlay1 = 0;
var pontoPlay2 = 0;

var meuLado;
var ladoOponente;
const ballRadius = 5; 
let bolaX = canvas.width / 5; // Posição horizontal da bola
let bolaY = canvas.height / 5; // Posição vertical da bola
let velocidadeBolaX = 1; // Velocidade horizontal da bola velocidadeBolaY
let velocidadeBolaY = 1; // Velocidade vertical da bola


const canvasPlacar = document.getElementById('canvas-placar');
const contextPlacar = canvasPlacar.getContext('2d');
const pontuacaoElement = document.getElementById('pontuacao');


socket.on('connect', function () {
  console.log('Conectado ao servidor:', socket.id);
});

socket.on('disconnect', function () {
  console.log('Desconectado do servidor:', socket.id);
  document.getElementById('game').style.display = 'none';
  document.getElementById('load').style.display = 'block';
});

socket.on('gameFound', function (data) {
  console.log('Jogo encontrado. Oponente ID:', data.opponentId);
});

socket.on('init', function(data) {
  initGame = data;
});

socket.on('waiting', function(msg) {
  document.getElementById('game').style.display = 'none';
  document.getElementById('load').style.display = 'block';
  document.getElementById('pontuacao').style.display = 'none';
  alert(msg);
});

socket.on('startGame', function(msg) {
  var mensagem = "";
  if (msg['message'] === "Jogo iniciou" && document.getElementById('load').style.display !== 'none') {
      mensagem = "Jogo iniciou s";
  }else{
      mensagem = "O jogo reiniciou";
  }
  showDialog(mensagem).then((confirmed) => {
      if (confirmed) {
        socket.emit('initGame', {status : true, canvasWidth : canvas.width , canvasHeight : canvas.height});
      } else {
        socket.emit('initGame', {status : false, canvasWidth : canvas.width , canvasHeight : canvas.height});
      }
    });
  myPlayerString = msg['role'];
  if (msg['role'] == "player2") {
      ladoOponente = (bolaX - ballRadius < 0 );
      meuLado= (bolaX + ballRadius > canvas.width);
      myPlayer = canvas.width - larguraRaquete - 1;
      oponentePlayer = 1;
  } else {
      meuLado = (bolaX - ballRadius < 0 );
      ladoOponente = (bolaX + ballRadius > canvas.width);
      oponentePlayer = canvas.width - larguraRaquete - 1;
      myPlayer = 1;
  }
  playerY = 50;
  opponentY = 50;
  document.getElementById('load').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('pontuacao').style.display = 'block';
});

socket.on('ballPosition', function (data) {
  /* console.log('Nova posição da bola:', data.x, data.y); */
  bolaX = data.x;
  bolaY = data.y;
});

socket.on('update', function (data) {
  opponentY = data.oponent;
});

socket.on('pontos', function (data) {
  console.log('Atualização da pontuação:', data.pontoPlay1, data.pontoPlay2);
  
  if (pontoPlay1 != data.pontoPlay1 || pontoPlay2 != data.pontoPlay2) {
    console.log("ponto para play1")
  }
  if (pontoPlay2 != data.pontoPlay2) {
    console.log("ponto para play2")
  }
  pontoPlay1 = data.pontoPlay1;
  pontoPlay2 = data.pontoPlay2;
  contextPlacar.clearRect(0, 0, canvasPlacar.width, canvasPlacar.height);
    contextPlacar.font = '20px Arial';
    contextPlacar.fillText(`Pontuação: ${pontoPlay1} x ${pontoPlay2} `, 10, 30);
    pontuacaoElement.textContent = `Pontuação: ${pontoPlay1} x ${pontoPlay2}`;
});



function sendPlayerPosition() {
  if (playerMoveUp && playerY > 0) {
    playerY -= 5;
  } else if (playerMoveDown && playerY + alturaRaquete < canvas.height) {
      playerY += 5;
  }
  socket.emit('paddlePosition', { playerY : playerY });
}

function sendBallPosition(x, y) {
  socket.emit('ballPosition', { x: x, y: y });
}

function sendScoreUpdate(player1Score, player2Score) {
  socket.emit('scoreUpdate', { player1: player1Score, player2: player2Score });
}

function resetBall() {
  bolaX = canvas.width / 2;
  bolaY = canvas.height / 2;
  velocidadeBolaX *= -1;
  velocidadeBolaY *= -1;
}


function desenharBola() {
  context.beginPath();
  context.arc(bolaX, bolaY, ballRadius, 0, Math.PI * 2, false);
  context.fillStyle = 'green';
  context.fill();
  context.closePath();
}
function desenharRaquetes() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'red';
  context.fillRect(myPlayer, playerY, larguraRaquete, alturaRaquete);
  context.fillStyle = 'black';
  context.fillRect(oponentePlayer, opponentY, larguraRaquete, alturaRaquete);
}



document.addEventListener('keydown', function(event) {
  if (event.key === 'ArrowUp') {
      playerMoveUp = true;
      sendPlayerPosition();
  } else if (event.key === 'ArrowDown') {
      playerMoveDown = true;
      sendPlayerPosition();
  }
});

// Evento de soltar a tecla
document.addEventListener('keyup', function(event) {
  if (event.key === 'ArrowUp') {
      playerMoveUp = false;
      sendPlayerPosition();
  } else if (event.key === 'ArrowDown') {
      playerMoveDown = false;
      sendPlayerPosition();
  }
});

function gameLoop() {
    desenharRaquetes();
    desenharBola();
    requestAnimationFrame(gameLoop);
}

gameLoop();

function showDialog(message) {
  return new Promise((resolve) => {
    const result = confirm(message);
    resolve(result);
  });
}
