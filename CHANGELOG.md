# Change Log

All notable changes to the "bookmark X" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added

- more preset funny bookmark icons(e.g. random poker)
- customizable bookmark/group icon
- [ ] support for multi workspace

## [0.1.8] - 2024-03-22
### Added
- now when you delete a group contains bookmarks, it will show a msg box to confirm with you.


## [0.1.7] - 2024-03-21
### Added
- optimize code

### fixed
- fix bug when add bookmark to active empty group, group collapse status don't refresh

## [0.1.6] - 2024-03-20
### Added
- change bookmark icon size for better icon support

### fixed
- fixed create/drag group error.

## [0.1.5] - 2024-03-19

### Added
- sort config(group first or plain sort)

### fixed
- after dragging/deleting last item in group, group collapse state not change.

## [0.1.4] - 2024-03-05

### Added

- reveal bookmark in current line(now it'll select item in treeview)
- create a cache called treeViewItemMap to avoid recreate treeViewItem
- changelog

### Fixed

- prevent slash in node name
- fix active group invalid after `clear data` while active group isn't root

### Changed

- use `inputBoxGetName` for label getting
- better objects linking process

## [0.1.3] - 2024-3

### Added

- show welcome page when there is no node in treeview
- different active group icon and color
- add `add sub group` command when right click group treeview item

## [0.1.2] - 2024-3

### Added

- customized bookmark svg icon

## [0.1.1] - 2024-3

## [0.1.0] - 2024-3

### Added

- bookmark x plugin published