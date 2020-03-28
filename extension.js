// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-
// Ref: <https://github.com/GNOME/gnome-shell/blob/3.36.0/js/ui/altTab.js>
// .... <https://github.com/GNOME/gnome-shell-extensions/blob/mainline/extensions/windowsNavigator/extension.js>

const { Atk, Clutter, Gio, GLib, GObject, Meta, Shell, St } = imports.gi;
const AltTab = imports.ui.altTab;
const WorkspaceManager = global.screen || global.workspace_manager;

var windowTracker;
var windowCount;

var NewAppSwitcher = GObject.registerClass(
class NewAppSwitcher extends AltTab.AppSwitcher {
    _init(apps, altTabPopup) {

        // retrieve window list for all workspaces
        let allWindows = global.display.get_tab_list(Meta.TabList.NORMAL, null);

        // we will create our own apps list to pass to the original _init
        // apps are split into 2
        // ... if they have many windows across multiple workspaces
        let appsCurrent = allWindows
            .filter(window => window.get_workspace() == workspace)
            .map(window => windowTracker.get_window_app(window))
            .filter((app, index, array) => array.indexOf(app) >= index);
        let appsOther = allWindows
            .filter(window => window.get_workspace() != workspace)
            .map(window => windowTracker.get_window_app(window))
            .filter((app, index, array) => array.indexOf(app) >= index);

        // pass both apps arrays together to the original _init
        super._init(appsCurrent.concat(appsOther), altTabPopup);

        let aIcons = this.icons;
        let appCount = appsCurrent.length; // number of apps on the current workspace

        // tidy up the cachedWindows on each AppIcon
        for (let i = 0; i < aIcons.length; i++) {
            if (aIcons[i].cachedWindows.length == 0)
                // support for Super+Tab Launcher extension
                continue;

            aIcons[i].actor.add_style_class_name(
                i < appCount ? 'alt-tab-app-current' : 'alt-tab-app-other'
            );

            aIcons[i].cachedWindows = aIcons[i].cachedWindows.filter(
                window => i < appCount
                ? window.get_workspace() == workspace
                : window.get_workspace() != workspace
            );

            if (aIcons[i].cachedWindows.length < 2)
                this._arrows[i].hide();
        }
    }
});

var NewWindowSwitcher = GObject.registerClass(
class NewWindowSwitcher extends AltTab.WindowSwitcher {
    _init(windows, mode) {
        let workspace = WorkspaceManager.get_active_workspace();

        let windowsCurrent = windows
            .filter(window => window.get_workspace() == workspace);
        let windowsOther = windows
            .filter(window => window.get_workspace() != workspace);
        let windowsAll = windows

        windowCount = windowsCurrent.length;

        // current workspace first
        super._init(windowsCurrent.concat(windowsOther), mode);

        // // personal flavor: do not change sequence, just mark the apps
        // super._init(windows, mode);
    }

    highlight(index, justOutline) {
        super.highlight(index, justOutline);

        // current workspace first
        this._label.remove_style_class_name(
            index < windowCount ? 'alt-tab-app-other' : 'alt-tab-app-current'
        );
        this._label.add_style_class_name(
            index < windowCount ? 'alt-tab-app-current' : 'alt-tab-app-other'
        );

        // // personal flavor: do not change sequence, just mark the apps
        // this._label.remove_style_class_name(
        //     windowsCurrent.indexOf(windowsAll[index]) > -1
        //     ? 'alt-tab-app-other' : 'alt-tab-app-current'
        // );
        // this._label.add_style_class_name(
        //     windowsCurrent.indexOf(windowsAll[index]) > -1
        //     ? 'alt-tab-app-current' : 'alt-tab-app-other'
        // );
    }
});

class Extension {
    constructor() {
        this._origAppSwitcher = AltTab.AppSwitcher;
        this._origWindowSwitcher = AltTab.WindowSwitcher;

        windowTracker = Shell.WindowTracker.get_default();
    }

    enable() {
        AltTab.AppSwitcher = NewAppSwitcher;
        AltTab.WindowSwitcher = NewWindowSwitcher;
    }

    disable() {
        AltTab.AppSwitcher = this._origAppSwitcher;
        AltTab.WindowSwitcher = this._origWindowSwitcher;
    }
}

function init() {
    return new Extension();
}
