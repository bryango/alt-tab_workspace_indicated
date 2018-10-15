// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

const AltTab = imports.ui.altTab;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

const WorkspaceManager = global.screen || global.workspace_manager;

var _originalProto = [];

var windowTracker;

var windowCount;

const appSwitcher_init = function(apps, altTabPopup)
{
    let workspace = WorkspaceManager.get_active_workspace();

    // retrieve window list for all workspaces
    let allWindows = global.display.get_tab_list(Meta.TabList.NORMAL, null);

    // we will create our own apps list to pass to the original _init
    // apps are split into 2 if they have many windows across multiple workspaces
    let appsCurrent = allWindows.filter(window => window.get_workspace() == workspace).map(window => windowTracker.get_window_app(window)).filter((app, index, array) => array.indexOf(app) >= index);
    let appsOther = allWindows.filter(window => window.get_workspace() != workspace).map(window => windowTracker.get_window_app(window)).filter((app, index, array) => array.indexOf(app) >= index);

    // pass both apps arrays together to the original _init
    _originalProto['appSwitcher_init'].apply(this, [appsCurrent.concat(appsOther), altTabPopup]);

    let aIcons = this.icons;
    let appCount = appsCurrent.length; // number of apps on the current workspace

    // tidy up the cachedWindows on each AppIcon
    for (let i = 0; i < aIcons.length; i++)
    {
        if (aIcons[i].cachedWindows.length == 0) // support for Super+Tab Launcher extension
            continue;

        aIcons[i].actor.add_style_class_name(i < appCount ? 'alt-tab-app-current' : 'alt-tab-app-other');

        aIcons[i].cachedWindows = aIcons[i].cachedWindows.filter(window => i < appCount ? window.get_workspace() == workspace : window.get_workspace() != workspace);

        if (aIcons[i].cachedWindows.length < 2)
            this._arrows[i].hide();
    }
};

const windowList_init = function(windows, mode)
{
    let workspace = WorkspaceManager.get_active_workspace();

    let windowsCurrent = windows.filter(window => window.get_workspace() == workspace);
    let windowsOther = windows.filter(window => window.get_workspace() != workspace);

    windowCount = windowsCurrent.length;

    _originalProto['windowList_init'].apply(this, [windowsCurrent.concat(windowsOther), mode]);
};

const windowList_highlight = function(index, justOutline)
{
    _originalProto['windowList_highlight'].apply(this, [index, justOutline]);

    this._label.remove_style_class_name(index < windowCount ? 'alt-tab-app-other' : 'alt-tab-app-current');
    this._label.add_style_class_name(index < windowCount ? 'alt-tab-app-current' : 'alt-tab-app-other');
};

function changeProto(parent, name, object)
{
    let original = parent[name];
    parent[name] = object;
    return original;
}

function init()
{
    windowTracker = Shell.WindowTracker.get_default();
}

function enable()
{
    _originalProto['appSwitcher_init'] = changeProto(AltTab.AppSwitcher.prototype, '_init', appSwitcher_init);
    _originalProto['windowList_init'] = changeProto(AltTab.WindowList.prototype, '_init', windowList_init);
    _originalProto['windowList_highlight'] = changeProto(AltTab.WindowList.prototype, 'highlight', windowList_highlight);
}

function disable()
{
    AltTab.AppSwitcher.prototype._init = _originalProto['appSwitcher_init'];
    AltTab.WindowList.prototype._init = _originalProto['windowList_init'];
    AltTab.WindowList.prototype.highlight = _originalProto['windowList_highlight'];
}
