;(() => {

/**
 * TODO:
 *    * очистка хранилища _после_успешной_ отправки на сервер (нажатии кнопки "Сохранить") (сделать ручку для очистки прост)
 *    * когда переходим на страницу, для которой есть автосейв - показывать уведомляшку с кнопкой "Восстановить"
 *    * показывать нотис при сохранении (типа галочку "сохранено")
 *    * автоочистка долго не востребованных сейвов (дабы не копились в сторадже)
 */


const showDebugInfo = true

const darn = showDebugInfo
    ? console.log.bind(console)
    : function () {}

// См. https://github.com/component/debounce
window.debounce = function (func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    if (null == wait) wait = 100;

    function later() {
        var last = Date.now() - timestamp;

        if (last < wait && last >= 0) {
            timeout = setTimeout(later, wait - last);
        } else {
            timeout = null;
            if (!immediate) {
                result = func.apply(context, args);
                context = args = null;
            }
        }
    };

    var debounced = function() {
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
            result = func.apply(context, args);
            context = args = null;
        }

        return result;
    };

    debounced.clear = function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };

    debounced.flush = function() {
        if (timeout) {
            result = func.apply(context, args);
            context = args = null;

            clearTimeout(timeout);
            timeout = null;
        }
    };

    return debounced;
}

////////////////////////////////////////////////////////////////////////////////

// Get page id by URL (типа неймспейс для разграничения полей)
window.getPageIdByUrl = function (urlArg) {
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

////////////////////////////////////////////////////////////////////////////////


class TextAutosaver {

    constructor (input) {
        this._input = input
    }
}

$.fn.autosave = function (options) {
    const $input = this

    const {
        storageNamespace = 'autosaves',
        afterChangeDelay = 3000,
        maxSaveInterval = 5000,
    } = options

    const inputStorageKey = getPageIdByUrl() + '___' + ($input.attr('name') || '')
    darn('inputStorageKey = ', inputStorageKey)

    let lastSaveTimestamp = 0


    // Когда пользователь печатает без пауз, debounce может долго не срабатывать -
    // на этот случай ставим интервальные сохранения
    let saveIntervalHandler

    function setupSaveIntervalHandler () {
        return setInterval(function () {
            darn(`Last save ${lastChangeTimestamp - lastSaveTimestamp} ms ago`)
            if (lastChangeTimestamp - lastSaveTimestamp > maxSaveInterval) {
                darn('Saving by maxSaveInterval...')
                save()
            }
        }, maxSaveInterval)
    }


    let lastChangeTimestamp = 0
    $input.on('input', function () {
        lastChangeTimestamp = +new Date()
        darn('lastChangeTimestamp update ', lastChangeTimestamp)

        // Заново ставим интервальные сохранения при изменении (начальном или после паузы)
        if (!saveIntervalHandler) {
            saveIntervalHandler = setupSaveIntervalHandler ()
            darn('Installed interval')
        }
    })


    // Throttling тут меньше подходит, т.к. с высокой вероятностью будет сохранять текст с обрывками слов.
    // Debounce срабатывает на паузах ввода, это немного "поумнее"
    $input.on('input', debounce(function() { // keyup, copy, paste, cut

        darn('Saving after debounce...')
        save()

        // Убираем интервал после паузы
        darn('Clear interval')
        clearInterval(saveIntervalHandler)
        saveIntervalHandler = null

    }, afterChangeDelay));


    function save() {
        let storage = localStorage[storageNamespace]
        if (storage) {
            try {
                storage = JSON.parse(localStorage[storageNamespace])
            } catch (error) {
                console.error(error)
                return
            }
        } else {
            storage = {}
        }

        storage[inputStorageKey] = $input.val();
        localStorage[storageNamespace] = JSON.stringify(storage);

        lastSaveTimestamp = +new Date()

        darn('Saved: ', localStorage[storageNamespace])
    }
}

$('[name="test_textarea"]').autosave({
    storageNamespace: 'autosaves',
});

// + `data-autosave-on` HTML attribute maybe?


})();
