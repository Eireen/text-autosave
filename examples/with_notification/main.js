;(function (window) {

const showDebugInfo = true

const darn = showDebugInfo
    ? console.log.bind(console)
    : function () {}



// ---------------------- USAGE ----------------------

$.fn.autosave = function (options) {
    const $input = this

    const autosaver = new window.TextAutosaver ($input, options)

    $input.data('textAutosaver', autosaver)

    const save = autosaver.getSave()
    if (save) {
        const $draftMessage = $('.draft-message')
        $draftMessage.show()
            .find('button[name="restore_draft"]')
                .click(function() {
                    autosaver.restore()
                    $draftMessage.hide()
                })
                .end()
            .find('button[name="delete_draft"]')
                .click(function() {
                    autosaver.deleteSave()
                    $draftMessage.hide()
                })
                .end()
            .find('button[name="hide_draft_message"]')
                .click(function() {
                    $draftMessage.hide()
                })
    }

    autosaver.on('save', function () {
        $('.message').html('<span class="message-success">Saved!</span>')
        setTimeout(() => {
            $('.message').html('&nbsp;') // чтоб не схлопывался
        }, 2500)
    })
}

$('[name="test_textarea"]').autosave({
    storageNamespace: 'autosaves',
});


})(window);
