/**
 * Handling of BUIC listings.
 *
 * @mixin
 * @namespace Bolt.buic.listing
 *
 * @param {Object} bolt - The Bolt module.
 * @param {Object} $ - jQuery.
 */
(function (bolt, $) {
    'use strict';

    /**
     * Bolt.buic.listing mixin container.
     *
     * @private
     * @type {Object}
     */
    var listing = {};

    /**
     * Bind BUIC listings.
     *
     * @static
     * @function init
     * @memberof Bolt.buic.listing
     *
     * @param {Object} buic
     */
    listing.init = function (buic) {
        initEvents(buic);
    };

    /**
     * Initializes all events inside a record listing table.
     *
     * @private
     * @static
     * @function initEvents
     * @memberof Bolt.buic.listing
     *
     * @param {Object} buic - Listing table
     */
    function initEvents(buic) {
        // Select all rows in a listing section.
        $(buic).find('tr.header th.menu li.select-all a').on('click', function () {
            $(this).closest('tbody').find('td input:checkbox[name="checkRow"]').each(function () {
                this.checked = true;
                rowSelection(this);
            });
            handleSelectionState(this);
        });

        // Unselect all rows in a listing section.
        $(buic).find('tr.header th.menu li.select-none a').on('click', function () {
            $(this).closest('tbody').find('td input:checkbox[name="checkRow"]').each(function () {
                this.checked = false;
                rowSelection(this);
            });
            handleSelectionState(this);
        });

        // On check/unchecking a row selector.
        $(buic).find('td input:checkbox[name="checkRow"]').on('click', function () {
            rowSelection(this);
            handleSelectionState(this);
        });

        // Record delete action.
        $(buic).find('tr.selectiontoolbar button.records-delete').on('click', function () {
            modifyRecords(this, 'delete');
        });

        // Record publish action.
        $(buic).find('tr.selectiontoolbar button.records-publish').on('click', function () {
            modifyRecords(this, 'publish');
        });

        // Record depublish action.
        $(buic).find('tr.selectiontoolbar button.records-depublish').on('click', function () {
            modifyRecords(this, 'depublish');
        });

        // Record draft action.
        $(buic).find('tr.selectiontoolbar button.records-draft').on('click', function () {
            modifyRecords(this, 'draft');
        });
    }

    /**
     * Execute commands on triggered button.
     *
     * @private
     * @static
     * @function modifyRecords
     * @memberof Bolt.buic.listing
     *
     * @param {object} button - Triggered list button.
     * @param {string} action - Triggered action (Allowed: 'delete').
     */
    function modifyRecords(button, action) {
        var container = $(button).closest('div.record-listing-container'),
            table = $(button).closest('table'),
            tbody = $(button).closest('tbody'),
            contenttype = $(table).data('contenttype'),
            checkboxes = tbody.find('td input:checkbox[name="checkRow"]:checked'),
            selectedIds = [],
            selectedRows = [],
            modifications = {},
            modification = {
                'delete': {'delete': null},
                'publish': {'modify': {'status': 'published'}},
                'depublish': {'modify': {'status': 'held'}},
                'draft': {'modify': {'status': 'draft'}}
            },
            actionName = {
                'delete': Bolt.data('recordlisting.action.delete'),
                'publish': Bolt.data('recordlisting.action.publish'),
                'depublish': Bolt.data('recordlisting.action.depublish'),
                'draft': Bolt.data('recordlisting.action.draft')
            },
            buttonText = $(button).html(),
            msg;

        $(checkboxes).each(function () {
            var row = $(this).parents('tr'),
                id = row.attr('id').substr(5);

            if (id) {
                selectedIds.push(id);
                selectedRows.push(row);
            }
        });

        if (selectedIds.length > 0) {
            // Build POST data.
            modifications[contenttype] = {};
            $(selectedIds).each(function () {
                modifications[contenttype][this] = modification[action];
            });

            // Build message:
            if (selectedIds.length === 1) {
                msg = Bolt.data('recordlisting.confirm.one');
            } else {
                msg = Bolt.data('recordlisting.confirm.multi', {'%NUMBER%': '<b>' + selectedIds.length + '</b>'});
            }
            msg = msg + '<br>' + Bolt.data('recordlisting.confirm.no-undo');

            // Remove when done:
            msg = msg + '<hr><b style="color:red;">Anti CSRF token functionality still disabled ' +
                'in Bolt\Controller\Async\Records::modify</b>';

            bootbox.dialog({
                message: msg,
                title: actionName[action],
                buttons: {
                    cancel: {
                        label: Bolt.data('recordlisting.action.cancel'),
                        className: 'btn-default'
                    },
                    ok: {
                        label: buttonText,
                        className: 'btn-primary',
                        callback: function () {
                            var url = Bolt.conf('paths.async') + 'content/modify';

                            $.ajax({
                                url: url,
                                type: 'POST',
                                data: {
                                    'bolt_csrf_token': $(table).data('bolt_csrf_token'),
                                    'contenttype': contenttype,
                                    'modifications': modifications
                                },
                                success: function (data) {
                                    $(container).replaceWith(data);
                                    initEvents($('div.record-listing-container table.buic-listing'));
                                },
                                error: function (jqXHR, textStatus, errorThrown) {
                                    console.log(jqXHR.status + ' (' + errorThrown + '):');
                                    console.log(JSON.parse(jqXHR.responseText));
                                },
                                dataType: 'html'
                            });
                        }
                    }
                }
            });
        }
    }

    /**
     * Handle row selection.
     *
     * @private
     * @static
     * @function rowSelection
     * @memberof Bolt.buic.listing
     *
     * @param {object} checkbox - Checkbox clicked.
     */
    function rowSelection(checkbox) {
        var row = $(checkbox).closest('tr');

        if (checkbox.checked) {
            row.addClass('row-selected');
        } else {
            row.removeClass('row-selected');
        }
    }

    /**
     * Hide/Show selection toolbar.
     *
     * @private
     * @static
     * @function handleSelectionState
     * @memberof Bolt.buic.listing
     *
     * @param {object} element - Element inside a tbody.
     */
    function handleSelectionState(element) {
        var tbody = $(element).closest('tbody'),
            menu = tbody.find('tr.header th.menu'),
            menuSel = menu.find('li.dropdown-header'),
            toolbar = tbody.find('tr.selectiontoolbar'),
            count = tbody.find('td input:checkbox[name="checkRow"]:checked').length,
            menuitems = menu.find('li.on-selection');

        // Show/hide toolbar & menu entries.
        if (count) {
            toolbar.removeClass('hidden');
            menuitems.removeClass('hidden');
        } else {
            toolbar.addClass('hidden');
            menuitems.addClass('hidden');
        }
        // Update selection count display.
        toolbar.find('div.count').text(count);
        // Update menu.
        menuSel.text(menuSel.text().replace(/\([#0-9]+\)/, '(' + count + ')'));
    }

    // Apply mixin container
    bolt.buic.listing = listing;

})(Bolt || {}, jQuery);
