/**
 * ====================================================================
 * CONFIGURAÇÃO GLOBAL (MODO PORTFÓLIO)
 * ====================================================================
 * NOTA: Esta é a versão refatorada e limpa do código original, preparada
 * para exibição em portfólio. Senhas, IDs e chaves reais foram removidos
 * e substituídos por dados fictícios/placeholders.
 */
const CONFIG = {
  SPREADSHEET_ID: "SEU_ID_DE_PLANILHA_AQUI", 
  SECRET_KEY: "CHAVE_SECRETA_SUPER_SEGURA_AQUI", // Ex: "MudeParaSuaFraseSuperSecreta&ComCaracteres#Especiais123!"
  SHEETS: {
    ATIVIDADES: "Atividades",
    BOLETINS: "Boletins",
    USUARIOS: "Usuarios"
  }
};

/**
 * ====================================================================
 * FUNÇÕES DE SEGURANÇA E AUTENTICAÇÃO
 * ====================================================================
 */

/**
 * Calcula o hash SHA-256 de uma senha usando a chave secreta global.
 * @param {string} password A senha em texto plano.
 * @returns {string} O hash gerado em formato hexadecimal.
 */
function computeHash(password) {
  const signature = Utilities.computeHmacSha256Signature(password, CONFIG.SECRET_KEY);
  return signature.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * Decodifica o payload de um token Base64 recebido.
 * @param {string} token O token Base64 gerado pelo login.
 * @returns {Object} Dados decodificados (email, perfil, exp, etc).
 */
function getDecodedToken(token) {
    if (!token) throw new Error("Token não fornecido.");
    try { 
      return JSON.parse(Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString()); 
    } catch (e) { 
      throw new Error("Token inválido ou corrompido."); 
    }
}

/**
 * Checa a validade e expiração de um token.
 * @param {string} token 
 * @returns {boolean}
 */
function verifyToken(token) {
  if (!token) return false;
  try {
    const decoded = getDecodedToken(token);
    return decoded.exp && decoded.exp > new Date().getTime();
  } catch (e) { 
    return false; 
  }
}

/**
 * ====================================================================
 * ROTEADORES PRINCIPAIS (doGet e doPost) API ESTILO REST
 * ====================================================================
 */

function doPost(e) {
  let responseData;
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    
    if (action === 'login') {
      responseData = login(params);
    } else {
      if (!verifyToken(params.token)) { 
        throw new Error("Autenticação inválida ou sessão expirada."); 
      }
      
      switch (action) {
        case 'createActivity': responseData = createActivity(params); break;
        case 'batchUpdateStatus': responseData = batchUpdateStatus(params); break;
        case 'deleteActivity': responseData = deleteActivity(params); break;
        case 'submitBulletin': responseData = submitBulletin(params); break;
        case 'manageUser': responseData = manageUser(params); break;
        default: throw new Error("Ação POST inválida.");
      }
    }
  } catch (error) { 
    responseData = { success: false, message: error.message }; 
  }
  
  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  let responseData;
  try {
    // Ação pública de login (opcional se precisar testar GET) ou verificação
    if (!verifyToken(e.parameter.token)) { 
      throw new Error("Autenticação inválida ou sessão expirada."); 
    }
    
    switch (e.parameter.action) {
      case 'getPendingActivities': responseData = getPendingActivities(); break;
      case 'getActivitiesList': responseData = getActivitiesList(); break;
      case 'getActivityDetails': responseData = getActivityDetails(e.parameter); break;
      case 'getActivity': responseData = getActivity(e.parameter); break;
      case 'getCompletedActivities': responseData = getCompletedActivities(e.parameter); break;
      case 'listUsers': responseData = listUsers(e.parameter); break;
      default: throw new Error("Ação GET inválida: " + e.parameter.action);
    }
  } catch (error) { 
    responseData = { success: false, message: error.message }; 
  }
  
  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ====================================================================
 * CONTROLADORES DE NEGÓCIO - ATIVIDADES, STATUS E BOLETINS
 * ====================================================================
 */

function batchUpdateStatus(params) {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.ATIVIDADES);
    const { updates, token } = params;
    
    if (!updates || updates.length === 0) {
        return { success: true, message: "Nenhuma atualização para sincronizar." };
    }

    const decodedToken = getDecodedToken(token);
    const operadorEmail = decodedToken.email;
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const headerMap = headers.reduce((obj, key, i) => ({ ...obj, [key]: i }), {});

    const requiredHeaders = ['id_atividade', 'ciclo', 'id_quadra', 'status', 'usuario_operador', 'data_modificacao'];
    for (const headerName of requiredHeaders) {
        if (typeof headerMap[headerName] === 'undefined') {
            throw new Error(`A coluna '${headerName}' não foi encontrada na planilha de Atividades.`);
        }
    }

    const dataMap = new Map();
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const key = `${row[headerMap.id_atividade]}::${row[headerMap.ciclo]}::${row[headerMap.id_quadra]}`;
        dataMap.set(key, i + 1);
    }

    updates.forEach(update => {
        const key = `${update.id_atividade}::${update.ciclo}::${update.id_quadra}`;
        const rowToUpdate = dataMap.get(key);
        if (rowToUpdate) {
            sheet.getRange(rowToUpdate, headerMap.status + 1).setValue(update.status);
            sheet.getRange(rowToUpdate, headerMap.usuario_operador + 1).setValue(operadorEmail);
            sheet.getRange(rowToUpdate, headerMap.data_modificacao + 1).setValue(new Date());
        }
    });

    return { success: true, message: `${updates.length} status atualizados.` };
}

function createActivity(params) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.ATIVIDADES);
  const { id_atividade, ciclos, quadras, veiculo, produto, bairros, motorista, operador } = params;
  
  if (!id_atividade || !ciclos || ciclos.length === 0 || !quadras || quadras.length === 0) {
    throw new Error("ID da atividade, o ciclo e quadras são campos obrigatórios.");
  }
  
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  // Encontrar registros antigos da mesma atividade+ciclo para substituí-los
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0].toString().trim() === id_atividade.toString().trim() && 
        ciclos.includes(data[i][1].toString().trim())) {
      rowsToDelete.push(i + 1);
    }
  }
  rowsToDelete.forEach(rowNum => sheet.deleteRow(rowNum));

  const newRows = [];
  
  for (const ciclo of ciclos) {
    quadras.forEach(q => {
      newRows.push([
        id_atividade, ciclo, q.area, q.id, q.setor_censitario, 'Pendente', 
        veiculo, produto, bairros, motorista, operador, 
        new Date(), '', '' 
      ]);
    });
  }
  
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
  
  return { success: true, message: `Atividade ${id_atividade} cadastrada/atualizada com sucesso.` };
}

function getActivity(params) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.ATIVIDADES);
  const { id_atividade, ciclo } = params;
  const data = sheet.getDataRange().getValues();
  
  const activityData = { quadras: {}, areas: new Set() };
  
  const COL_ID_ATIVIDADE = 0;
  const COL_CICLO = 1;
  const COL_ID_AREA = 2; 
  const COL_ID_QUADRA = 3;
  const COL_STATUS = 5;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[COL_ID_ATIVIDADE]) === String(id_atividade) && 
        String(row[COL_CICLO]) === String(ciclo)) {
          
      const compositeKey = `${row[COL_ID_AREA]}-${row[COL_ID_QUADRA]}`;
      activityData.quadras[compositeKey] = row[COL_STATUS];
      activityData.areas.add(String(row[COL_ID_AREA]));
    }
  }
  activityData.areas = Array.from(activityData.areas);
  return { success: true, data: activityData };
}

function getActivityDetails(params) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.ATIVIDADES);
  const data = sheet.getDataRange().getValues();
  const { id_atividade, ciclo } = params;
  
  const activityDetails = { quadras: [], statusMap: {} };
  let detailsSet = false;

  const COL_ID_AREA = 2; 

  data.forEach((row, i) => {
    if (i > 0 && String(row[0]) === String(id_atividade) && String(row[1]) === String(ciclo)) {
      if (!detailsSet) {
        Object.assign(activityDetails, {
          id: String(row[0]), 
          ciclo: String(row[1]), 
          veiculo: row[6], 
          produto: row[7], 
          bairros: row[8], 
          motorista: row[9], 
          operador: row[10]
        });
        detailsSet = true;
      }
      activityDetails.quadras.push({ area: row[COL_ID_AREA], id: row[3] }); 
      activityDetails.statusMap[`${row[COL_ID_AREA]}-${row[3]}`] = row[5]; 
    }
  });
  
  return { success: true, data: activityDetails };
}

// ... Outras funções de leitura 
function getPendingActivities() {
  const data = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.ATIVIDADES).getDataRange().getValues();
  const completedTasks = getCompletedTaskKeys();
  const activities = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const taskKey = `${row[0]}::${row[1]}`;
    if (row[0] && !activities[taskKey] && !completedTasks.has(taskKey)) {
      activities[taskKey] = {
        id: row[0].toString(), 
        ciclo: row[1].toString(), 
        veiculo: row[6], 
        produto: row[7], 
        motorista: row[9], 
        operador: row[10]
      };
    }
  }
  
  return { 
    success: true, 
    data: Object.values(activities).sort((a,b) => String(a.id).localeCompare(String(b.id)) || String(a.ciclo).localeCompare(String(b.ciclo))) 
  };
}

function getActivitiesList() {
  const data = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.ATIVIDADES).getDataRange().getValues();
  const completedTasks = getCompletedTaskKeys();
  const activities = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const taskKey = `${row[0]}::${row[1]}`;
    if (row[0] && !completedTasks.has(taskKey)) {
      if (!activities[taskKey]) {
        activities[taskKey] = {
          id: row[0].toString(), 
          ciclo: row[1].toString(), 
          data: new Date(row[11]).toLocaleDateString('pt-BR'), 
          veiculo: row[6], 
          totalQuadras: 0, 
          quadrasTrabalhadas: 0
        };
      }
      activities[taskKey].totalQuadras++;
      if (row[5] === 'Trabalhada') activities[taskKey].quadrasTrabalhadas++;
    }
  }
  return { success: true, data: Object.values(activities).reverse() };
}

function deleteActivity(params) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.ATIVIDADES);
  const { id_atividade, ciclo } = params;
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0].toString() === id_atividade.toString() && data[i][1].toString() === ciclo.toString()) {
      rowsToDelete.push(i + 1);
    }
  }
  rowsToDelete.forEach(rowNum => sheet.deleteRow(rowNum));
  return { success: true, message: `Atividade ${id_atividade} (${ciclo}) excluída permanentemente.` };
}

function submitBulletin(params) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.BOLETINS);
  sheet.appendRow([
    params.id_atividade, params.ciclo, new Date(), params.patrimonio, params.viatura, 
    params.inseticida, params.vol_inicial, params.vol_final, params.consumo, 
    params.consumo_gasolina, params.hora_inicio, params.temp_inicio, params.hora_termino, 
    params.temp_termino, params.tempo_interrupcao, params.tempo_aplicacao, params.odo_inicio, 
    params.odo_termino, params.km_rodado, params.ocorrencias, params.observacao
  ]);
  return { success: true, message: "Boletim enviado e registrado com sucesso." };
}

function getCompletedActivities(params) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.BOLETINS);
  if (!sheet) return { success: true, data: [] };
  
  const data = sheet.getDataRange().getValues();
  const searchId = params.id_atividade ? params.id_atividade.trim().toUpperCase() : null;
  const startDate = params.startDate ? new Date(params.startDate) : null;
  const endDate = params.endDate ? new Date(params.endDate) : null;
  
  if (startDate) startDate.setHours(0, 0, 0, 0);
  if (endDate) endDate.setHours(23, 59, 59, 999);
  
  const results = [];
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const submissionDate = new Date(row[2]);
    
    if ((searchId && row[0].toString().toUpperCase().indexOf(searchId) === -1) || 
        (startDate && submissionDate < startDate) || 
        (endDate && submissionDate > endDate)) {
      continue;
    }
    
    results.push({
      id: row[0].toString(), 
      ciclo: row[1].toString(), 
      data: submissionDate.toLocaleDateString('pt-BR'), 
      viatura: row[4], 
      ocorrencias: row[19]
    });
  }
  return { success: true, data: results };
}

function getCompletedTaskKeys() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.BOLETINS);
  if (!sheet) return new Set();
  const data = sheet.getRange("A2:B" + sheet.getLastRow()).getValues();
  const completedTasks = new Set();
  
  data.forEach(row => { 
    if (row[0] && row[1]) completedTasks.add(`${row[0]}::${row[1]}`); 
  });
  return completedTasks;
}

/**
 * ====================================================================
 * GERENCIAMENTO E AUTENTICAÇÃO DE USUÁRIOS
 * ====================================================================
 */

function login(params) {
  const { email, password } = params;
  if (!email || !password) throw new Error("Email e senha são preenchimentos obrigatórios.");
  
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USUARIOS);
  const data = sheet.getDataRange().getValues();
  const passwordHash = computeHash(password);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === email.toLowerCase() && data[i][1] === passwordHash) {
      const tokenPayload = { 
        email: data[i][0], 
        perfil: data[i][2], 
        nome: data[i][3], 
        exp: new Date().getTime() + (8 * 60 * 60 * 1000) 
      };
      
      return { 
        success: true, 
        token: Utilities.base64Encode(JSON.stringify(tokenPayload)), 
        email: data[i][0], 
        perfil: data[i][2], 
        nome: data[i][3] 
      };
    }
  }
  throw new Error("Credenciais inválidas.");
}

function listUsers(params) {
    const decodedToken = getDecodedToken(params.token);
    if (decodedToken.perfil !== 'Gestor') { throw new Error("Acesso restrito a gestores."); }
    
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USUARIOS);
    const data = sheet.getRange("A2:D" + sheet.getLastRow()).getValues();
    const users = [];
    
    data.forEach(row => { if(row[0]) { users.push({ email: row[0], perfil: row[2], nome: row[3] }); } });
    return { success: true, data: users };
}

function manageUser(params) {
    const decodedToken = getDecodedToken(params.token);
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USUARIOS);
    const data = sheet.getDataRange().getValues();
    
    switch (params.sub_action) {
        case 'create':
            if (decodedToken.perfil !== 'Gestor') throw new Error("Apenas gestores têm permissão para criar usuários.");
            const { nome, email, perfil, password } = params.userData;
            if (!nome || !email || !perfil || !password) throw new Error("Campos incompletos.");
            
            for (let i = 1; i < data.length; i++) { 
                if (data[i][0].toLowerCase() === email.toLowerCase()) throw new Error("Email já em uso."); 
            }
            sheet.appendRow([email.toLowerCase(), computeHash(password), perfil, nome]);
            return { success: true, message: `O usuário ${nome} foi criado com sucesso.` };
            
        case 'delete':
            if (decodedToken.perfil !== 'Gestor') throw new Error("Apenas gestores têm permissão de exclusão.");
            if (params.userEmail.toLowerCase() === decodedToken.email.toLowerCase()) throw new Error("Auto-exclusão não é permitida.");
            
            for (let i = data.length - 1; i >= 1; i--) {
                if (data[i][0].toLowerCase() === params.userEmail.toLowerCase()) {
                    sheet.deleteRow(i + 1);
                    return { success: true, message: `A conta de ${params.userEmail} foi removida.` };
                }
            }
            throw new Error("Usuário inacessível ou inexistente.");
            
        case 'reset_password':
            if (decodedToken.perfil !== 'Gestor') throw new Error("Ação não autorizada.");
            if (!params.newPassword) throw new Error("Forneça a nova senha.");
            
            for (let i = 1; i < data.length; i++) {
                if (data[i][0].toLowerCase() === params.userEmail.toLowerCase()) {
                    sheet.getRange(i + 1, 2).setValue(computeHash(params.newPassword));
                    return { success: true, message: `Redefinição de senha do usuário ${params.userEmail} concluída.` };
                }
            }
            throw new Error("Usuário não encontrado.");
            
        case 'change_own_password':
            const { oldPassword, newPassword } = params.passwordData;
            if (!oldPassword || !newPassword) throw new Error("Preencha as senhas atual e nova.");
            
            for (let i = 1; i < data.length; i++) {
                if (data[i][0].toLowerCase() === decodedToken.email.toLowerCase()) {
                    if (data[i][1] !== computeHash(oldPassword)) throw new Error("A senha atual em uso não condiz.");
                    sheet.getRange(i + 1, 2).setValue(computeHash(newPassword));
                    return { success: true, message: "A alteração da sua própria senha foi efetivada." };
                }
            }
            throw new Error("Perfil impossível de acessar.");
            
        default: throw new Error("Ordem de execução não reconhecida.");
    }
}

/**
 * ====================================================================
 * UTILITÁRIO - HASH INICIAL
 * ====================================================================
 */

/**
 * Utilitário de backend: Usado por administradores para criar o primeiro
 * hash de senha (rodar manualmente no editor do Google Apps Script).
 */
function generateInitialHash() {
  const passwordToHash = "senhaAte123"; 
  const hashResult = computeHash(passwordToHash);
  Logger.log("Senha Base: " + passwordToHash);
  Logger.log("Hash resultante: " + hashResult);
}
