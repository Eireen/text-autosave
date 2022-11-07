/**
 * Pub-sub (or events) functionality for plain objects.
 * 
 * Реализация через вливание объекта (выполняется в конструкторе целевого класса / после создания объекта)
 * 
 * Usage:
 *     EventableMixin (this)  // in a class constructor
 *     EventableMixin (someConcreteObject)  // elsewhere
 */
function EventableMixin (objToExtend) {

    const listeners = {}

    return Object.assign(objToExtend, {

        on (names, handler) {
            if (!Array.isArray(names)) names = [ names ]

            for (const name of names) {
                if (!listeners[name]) listeners[name] = []
                listeners[name].push(handler)
            }

            return this
        },

        off (names, handler) {
            if (!Array.isArray(names)) names = [ names ]

            for (const name of names) {
                if (!listeners[name]) continue

                for (var i = listeners[name].length - 1; i >= 0; i--) {
                    if (listeners[name][i] == handler) {
                        listeners[name].splice(i, 1)
                    }
                }
            }

            return this
        },

        triggerEvent (name, ...args) {
            if (!listeners[name]) return

            for (var i = 0; i < listeners[name].length; i++) {
                listeners[name][i].apply(this, args)
            }

            return this
        },

    })
}
