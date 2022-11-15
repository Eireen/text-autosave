;(function (window) {

const showDebugInfo = true

const darn = showDebugInfo
    ? console.log.bind(console)
    : function () {}


////////////////////////////////////////////////////////////////////////////////

// Dependencies
let deps = {
    debounce: null,
    EventableMixin: null,
}

function DepsMixin (depNames, objToExtend) {

    return Object.assign(objToExtend, {

        setDeps(customDeps = null) {
            for (let depName of depNames) {
                deps[depName] = customDeps && customDeps[depName] !== undefined
                    ? customDeps[depName]
                    : window[depName]
            }
        },

        checkDeps() {
            // const className = objToExtend.name

            for (let depName in deps) {
                if (!deps[depName]) {
                    const message = depName === 'jQuery'
                        ? `\`TextAutosaver\` requires jQuery (tested version is 2.2.4)`
                        : `Cannot find dependency: \`${depName}\`.\nBefore using \`TextAutosaver\`, you must either include scripts from \`lib\` directory, or pass dependencies explicitly via calling \`setDeps\` before initialization.`
                    throw message
                }
            }

            const { constructor: _static } = this
            _static.areDepsSet = true
        },

    })
}

////////////////////////////////////////////////////////////////////////////////


/**
 * Демка: https://plnkr.co/plunk/KNJz3eNe77XPLTwc
 * 
 * По подключению зависимостей:
 *    * `debounce` и `EventableMixin` выделены в отдельные файлы, которые пользователь либы должен подключить сам;
 *    * на случай конфликтов имён в целевых проектах - можно передать зависимости с другими именами:
 *        `TextAutosaver.setDeps({ debounce: myDebounceFunction, EventableMixin: myEventableMixin })`
 */
window.TextAutosaver = DepsMixin (['jQuery', 'debounce', 'EventableMixin'], class {

    constructor (input, options) {

        if (options.showDebugInfo !== undefined) {
            ;({ showDebugInfo } = options)
        }

        const { constructor: _static } = this

        if (!_static.areDepsSet) {
            _static.setDeps()
            _static.checkDeps()
        }

        this.$input = $(input)
        this.options = Object.assign({}, _static.defaultOptions(), options)

        this.lastChangeTimestamp = 0
        this.lastSaveTimestamp = 0

        // Когда пользователь печатает без пауз, debounce может долго не срабатывать -
        // на этот случай ставим интервальные сохранения
        this.saveIntervalHandle = null

        deps.EventableMixin (this)

        if (!_static.areStaleCleared) {
            // Вызываем очистку невостребованных сейвов 1 раз за период жизни страницы
            this.clearStaleSaves()
            _static.areStaleCleared = true
        }

        this.init()
    }

    static defaultOptions () {
        return {
            storageNamespace: 'autosaves',
            afterChangeDelay: 3000,
            maxSaveInterval: 5000,
        }
    }

    getStorageKeyForInput () {
        const { $input } = this
        const inputStorageKey = this.getPageIdByUrl() + '___' + ($input.attr('name') || '')
        darn('inputStorageKey = ', inputStorageKey)
        return inputStorageKey
    }

    init () {
        const { $input } = this
        const {
            storageNamespace,
            afterChangeDelay,
            maxSaveInterval,
        } = this.options


        $input.on('input', () => {
            this.lastChangeTimestamp = +new Date()
            // darn('lastChangeTimestamp update ', this.lastChangeTimestamp)

            // Заново ставим интервальные сохранения при изменении (начальном или после паузы)
            if (!this.saveIntervalHandle) {
                this.installSaveInterval ()
            }
        })


        // Throttling тут меньше подходит, т.к. с высокой вероятностью будет сохранять текст с обрывками слов.
        // Debounce срабатывает на паузах ввода, это немного "поумнее"
        $input.on('input', debounce(() => { // keyup, copy, paste, cut

            if (this.lastChangeTimestamp > this.lastSaveTimestamp) {
                darn('Saving after debounce...')
                this.save()
            } else {
                darn('Saving after debounce: already saved, skipping...')
            }

            // Убираем интервал после паузы
            this.uninstallSaveInterval()

        }, afterChangeDelay));
    }

    save() {
        const { $input } = this
        const {
            storageNamespace,
        } = this.options

        const allSaves = this.getAllSaves()

        const inputStorageKey = this.getStorageKeyForInput()

        const newSave = {
            timestamp: this.getTimestamp(),
            value: $input.val(),
        }
        allSaves[inputStorageKey] = newSave

        this.writeAllSaves(allSaves)

        this.lastSaveTimestamp = +new Date()

        darn('Saved: ', newSave)

        this.triggerEvent('save')
    }

    writeAllSaves(newAllSaves) {
        const {
            storageNamespace,
        } = this.options

        localStorage[storageNamespace] = JSON.stringify(newAllSaves)

        darn('Wrote full dump: ', localStorage[storageNamespace])
    }

    installSaveInterval () {
        const {
            maxSaveInterval,
        } = this.options

        this.saveIntervalHandle = setInterval(() => {
            darn(`Last save ${this.lastChangeTimestamp - this.lastSaveTimestamp} ms ago`)
            if (this.lastChangeTimestamp - this.lastSaveTimestamp > maxSaveInterval) {
                darn('Saving by maxSaveInterval...')
                this.save()
            }
        }, maxSaveInterval)

        darn('Installed interval')
    }

    uninstallSaveInterval () {
        darn('Clear interval')
        clearInterval(this.saveIntervalHandle)
        this.saveIntervalHandle = null
    }

    // Get page id by URL (типа неймспейс для разграничения полей)
    getPageIdByUrl (urlArg) {
        let url = urlArg === undefined
            ? location.pathname
            : String(urlArg)

        // Remove query part (if exists)
        url = url.split('?')[0]

        // remove enclosing slashes
        url = url.replace(/^\/|\/$/g, '')

        // Empty path redirects to the dashboard at the moment
        if (!url) url = 'dashboard'

        return url
    }

    getAllSaves () {
        const { storageNamespace } = this.options

        let allSaves = {}

        if (localStorage[storageNamespace]) {
            try {
                allSaves = JSON.parse(localStorage[storageNamespace])
            } catch (error) {
                console.error(error)
                return allSaves
            }
        }

        return allSaves
    }

    getSave () {
        const allSaves = this.getAllSaves()

        const inputStorageKey = this.getStorageKeyForInput()

        return allSaves[inputStorageKey]
    }

    // Удалить сейв своего поля
    deleteSave () {
        const inputStorageKey = this.getStorageKeyForInput()
        this.deleteSavesForInputs([ inputStorageKey ])
    }

    // Удалить сейв
    deleteSavesForInputs (inputSaveIds) { // static
        if (!inputSaveIds.length) return

        const allSaves = this.getAllSaves()

        for (let inputSaveId of inputSaveIds) {
            delete allSaves[inputSaveId]
        }

        this.writeAllSaves(allSaves)
    }

    // Установить сейв в поле - ?
    restore () {
        const { $input } = this
        const save = this.getSave()
        $input.val(save.value)
    }

    // Автоочистка долго не востребованных сейвов (дабы не забивали сторадж)
    clearStaleSaves () { // static
        const LIFETIME_TS = 60 * 60 * 24 * 7  // 7 days
        const allSaves = this.getAllSaves()

        const inputSaveIdsToDelete = []

        for (let inputSaveId in allSaves) {
            const save = allSaves[inputSaveId]
            const nowTimestamp = this.getTimestamp()
            if (nowTimestamp - save.timestamp > LIFETIME_TS) {
                // Save is stale
                inputSaveIdsToDelete.push(inputSaveId)
            }
        }

        this.deleteSavesForInputs(inputSaveIdsToDelete)

        if (inputSaveIdsToDelete.length) darn('Cleared stale saves: ', inputSaveIdsToDelete)
    }

    getTimestamp() { // static
        return Math.round(+new Date() / 1000)
    }
})


})(window);
