const CONFIG = {
  MAX_COUNT_FOR_100_PERCENT: 100,
  TIME_LIMIT: 15,
  TIMER_WARNING: 5,
  DIFFICULTY_STEP: 0.2,
  TIMER_UPDATE_MS: 1000,
  MAX_FAILS: 5,
}

const DOM = {
  list: document.getElementById("wordsUsed"),
  timer: document.getElementById("timer"),
  count: document.getElementById("count"),
  wordInput: document.getElementById("word"),
  description: document.getElementById("description"),
  fails: document.getElementById("fails"),
  startModal: document.getElementById("startModal"),
  endModal: document.getElementById("endModal"),
  scoreDisplay: document.getElementById("finalScore"),
  endTitle: document.getElementById("endTitle"),
  startBtnEs: document.getElementById("startBtnEs"),
  startBtnEn: document.getElementById("startBtnEn"),
  restartBtnEs: document.getElementById("restartBtnEs"),
  restartBtnEn: document.getElementById("restartBtnEn"),
}

let currentLetters = []
let dictionarySet = new Set()
let dictionaryArr = []
let timerInterval

const gameState = {
  wordsUsed: new Set(),
  currentPrefix: "",
  difficulty: 0,
  fails: 0,
  isPlaying: false,
}

const getWordCount = (dictionaryList, wordsUsedSet, suffix) => {
  const upperSuffix = suffix
  let count = 0
  for (let i = 0; i < dictionaryList.length; i++) {
    const dictWord = dictionaryList[i]
    if (dictWord.startsWith(upperSuffix)) {
      if (!wordsUsedSet.has(dictWord)) count++
    }
  }
  return count
}

const fetchData = async (filename, fallback) => {
  try {
    const res = await fetch(filename)
    if (!res.ok) throw new Error(`Error loading ${filename}`)
    return await res.json()
  } catch (err) {
    console.error(err)
    return fallback
  }
}

const getRandomPrefix = (
  letters,
  dictionaryList,
  wordsUsedSet,
  difficulty,
  previousWord
) => {
  let currentDifficulty = previousWord
    ? Math.min(difficulty, previousWord.length)
    : 0

  while (currentDifficulty > 0) {
    const sliceIndex = Math.floor(currentDifficulty) || 1
    const suffix = previousWord.slice(-sliceIndex).toUpperCase()
    const count = getWordCount(dictionaryList, wordsUsedSet, suffix)
    const probability = count / CONFIG.MAX_COUNT_FOR_100_PERCENT
    const isValidStart = Math.random() <= probability

    if (isValidStart) {
      DOM.count.textContent = `Total: ${count}`
      return { prefix: suffix, difficulty }
    }
    currentDifficulty -= CONFIG.DIFFICULTY_STEP
  }

  const randomLetter =
    letters[Math.floor(Math.random() * letters.length)].toUpperCase()
  return { prefix: randomLetter, difficulty: 0 }
}

const addWordToHistory = (word) => {
  if (!DOM.list) return
  const $newItem = document.createElement("li")
  $newItem.textContent = word
  $newItem.classList.add("lastWord")
  DOM.list.appendChild($newItem)
  DOM.list.scrollTop = DOM.list.scrollHeight
  setTimeout(() => $newItem.classList.remove("lastWord"), 800)
}

const clearHistory = () => {
  if (DOM.list) DOM.list.innerHTML = ""
}

const addFail = () => {
  if (!DOM.fails) return
  const $newFail = document.createElement("span")
  $newFail.textContent = "X"
  DOM.fails.appendChild($newFail)
}

const clearFails = () => {
  if (DOM.fails) DOM.fails.innerHTML = ""
}

const startTimer = (onGameOver) => {
  clearInterval(timerInterval)
  let timeLeft = CONFIG.TIME_LIMIT

  const updateDisplay = () => {
    DOM.timer.textContent = `Tiempo: ${timeLeft}s`
    DOM.timer.style.color = timeLeft <= CONFIG.TIMER_WARNING ? "red" : "#333"
  }
  updateDisplay()

  timerInterval = setInterval(() => {
    timeLeft--
    updateDisplay()
    if (timeLeft <= 0) {
      clearInterval(timerInterval)
      onGameOver()
    }
  }, CONFIG.TIMER_UPDATE_MS)
}

const handleGameOver = (reason) => {
  clearInterval(timerInterval)
  gameState.isPlaying = false
  DOM.wordInput.disabled = true
  DOM.wordInput.classList.add("error")

  DOM.endTitle.textContent = reason
  DOM.scoreDisplay.textContent = gameState.wordsUsed.size
  DOM.endModal.classList.remove("hidden")
}

const initTurn = (prevWord = null) => {
  const next = getRandomPrefix(
    currentLetters,
    dictionaryArr,
    gameState.wordsUsed,
    gameState.difficulty + (prevWord ? CONFIG.DIFFICULTY_STEP : 0),
    prevWord
  )

  gameState.currentPrefix = next.prefix
  gameState.difficulty = next.difficulty

  DOM.wordInput.value = gameState.currentPrefix
  DOM.wordInput.focus()
  DOM.wordInput.disabled = false
  DOM.wordInput.classList.remove("error")

  console.log(
    `Turno: ${gameState.currentPrefix} (Dif: ${gameState.difficulty.toFixed(
      1
    )})`
  )

  startTimer(() => handleGameOver("¡Tiempo agotado!"))
}

const resetGameState = () => {
  gameState.wordsUsed.clear()
  gameState.currentPrefix = ""
  gameState.difficulty = 0
  gameState.fails = 0
  gameState.isPlaying = true
  clearHistory()
  clearFails()
  DOM.wordInput.value = ""
  DOM.wordInput.disabled = false
  DOM.wordInput.classList.remove("error")
}

const loadLanguageData = async (lang) => {
  const lettersFile = lang === "es" ? "letters-es.json" : "letters-en.json"
  const dictFile = lang === "es" ? "dictionary-es.json" : "dictionary-en.json"

  DOM.wordInput.placeholder = "Cargando..."
  DOM.wordInput.disabled = true

  const [lettersData, dictionaryObj] = await Promise.all([
    fetchData(lettersFile, []),
    fetchData(dictFile, {}),
  ])

  currentLetters = lettersData
  dictionarySet = new Set(
    Object.keys(dictionaryObj).map((w) => w.toUpperCase())
  )
  dictionaryArr = Array.from(dictionarySet)

  console.log(`Idioma ${lang} cargado. ${dictionaryArr.length} palabras.`)
  DOM.wordInput.placeholder = ""
}

const startGame = async (lang) => {
  DOM.startModal.classList.add("hidden")
  DOM.endModal.classList.add("hidden")

  await loadLanguageData(lang)
  resetGameState()
  initTurn(null)
}

const initEventListeners = () => {
  DOM.wordInput.addEventListener("input", () => {
    if (!gameState.isPlaying) return

    const prefix = gameState.currentPrefix
    let val = DOM.wordInput.value.toUpperCase()
    DOM.wordInput.value = val

    if (!val.startsWith(prefix)) {
      val = prefix + val.replace(prefix, "")
      if (!val.startsWith(prefix)) val = prefix
      DOM.wordInput.value = val
    }
  })

  DOM.wordInput.addEventListener("keydown", (e) => {
    if (!gameState.isPlaying) return

    const prefixLen = gameState.currentPrefix.length

    if (e.key === "Backspace" && DOM.wordInput.selectionStart <= prefixLen) {
      if (DOM.wordInput.selectionStart === DOM.wordInput.selectionEnd) {
        e.preventDefault()
        return
      }
    }

    if (e.key === "Enter") {
      const rawWord = DOM.wordInput.value.trim()
      const upperWord = rawWord.toUpperCase()

      const isValidDict = dictionarySet.has(upperWord)
      const isUsed = gameState.wordsUsed.has(upperWord)
      const hasPrefix = upperWord.startsWith(gameState.currentPrefix)
      const isLongEnough = upperWord.length > 1

      if (isValidDict && !isUsed && hasPrefix && isLongEnough) {
        gameState.wordsUsed.add(upperWord)
        addWordToHistory(rawWord)
        initTurn(rawWord)
        gameState.fails = 0
        clearFails()
      } else {
        DOM.wordInput.classList.add("error")
        gameState.fails++
        addFail()

        if (gameState.fails >= CONFIG.MAX_FAILS) {
          handleGameOver("¡Demasiados fallos!")
        } else {
          setTimeout(() => DOM.wordInput.classList.remove("error"), 200)
        }
      }
    }
  })

  if (DOM.startBtnEs)
    DOM.startBtnEs.addEventListener("click", () => startGame("es"))
  if (DOM.startBtnEn)
    DOM.startBtnEn.addEventListener("click", () => startGame("en"))

  if (DOM.restartBtnEs)
    DOM.restartBtnEs.addEventListener("click", () => startGame("es"))
  if (DOM.restartBtnEn)
    DOM.restartBtnEn.addEventListener("click", () => startGame("en"))
}

initEventListeners()
