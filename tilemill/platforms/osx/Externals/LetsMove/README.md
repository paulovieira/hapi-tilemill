LetsMove
========

A sample project that demonstrates how to move a running Mac OS X application to the Applications folder.


Version History
---------------

* 1.6.2
	- Garbage collection compatibility added
	- Use a new method to check if an application is already running on Mac OS X 10.6 systems or higher

* 1.6.1
	- Use exit(0) to terminate the app before relaunching instead of [NSApp terminate:]. We don't want applicationShouldTerminate or applicationWillTerminate NSApplication delegate methods to be called, possibly introducing side effects.

* 1.6
	- Resolve any aliases when finding the Applications directory

* 1.5.2
	- Cleaned up the code a bit. Almost functionally equivalent to 1.5.1.

* 1.5.1
	- Fixed a bug with clearing the quarantine file attribute on Mac OS X 10.5

* 1.5
	- Don't prompt to move the application if it has "Applications" in its path somewhere

* 1.4
	- Mac OS X 10.5 compatibility fixes

* 1.3
	- Fixed a rare bug in the shell script that checks to see if the app is already running
	- Clear quarantine flag after copying
	- Compile time option to show normal sized alert supress checkbox button
	- German, Danish, and Norwegian localizations added

* 1.2
	- Copy application from disk image then unmount disk image
	- Spanish, French, Dutch, and Russian localizations

* 1.1
	- Prefers ~/Applications over /Applications if it exists
	- Escape key pushes the "Do Not Move" button

* 1.0
	- First release


Requirements
------------
Builds and runs on Mac OS X 10.4 or higher.


Code Contributors:
-------------
* Andy Kim
* John Brayton
* Chad Sellers
* Kevin LaCoste
* Rasmus Andersson
* Timothy J. Wood
* Matt Gallagher (NSString+SymlinksAndAliases)

Translators:
------------
* Eita Hayashi (Japanese)
* Gleb M. Borisov (Russian)
* Wouter Broekhof (Dutch)
* Rasmus Andersson / Spotify (French and Spanish)
* Markus Kirschner (German)
* Fredrik Nannestad (Danish)
* Georg Alexander Bøe (Norwegian)
* Marco Improda (Italian)
