#!/usr/bin/env python3
"""Drive one WebKitGTK page for the required-cell browser runner.

Speaks newline-delimited JSON on stdin/stdout. Hardware acceleration stays off
because this host's GDK backend has no GL context. This is system WebKitGTK (WebKit2 4.1), not Safari.
"""
from __future__ import annotations

import json
import sys

import gi

gi.require_version('Gtk', '3.0')
gi.require_version('WebKit2', '4.1')
from gi.repository import GLib, Gtk, WebKit2


def reply(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload) + '\n')
    sys.stdout.flush()


window = Gtk.Window(title='ngx-required-webkit')
window.set_default_size(1280, 900)
view = WebKit2.WebView()
settings = view.get_settings()
settings.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.NEVER)
settings.set_enable_javascript(True)
window.add(view)
window.show_all()
view.grab_focus()


def on_terminated(_webview, reason) -> None:
    sys.stderr.write(f'webkit web-process-terminated reason={int(reason)}\n')
    sys.stderr.flush()


def on_load_failed(_webview, _event, uri, error) -> bool:
    sys.stderr.write(f'webkit load-failed uri={uri} error={error}\n')
    sys.stderr.flush()
    return False


view.connect('web-process-terminated', on_terminated)
view.connect('load-failed', on_load_failed)

busy = {'on': False}


def on_stdin(_source, _condition) -> bool:
    if busy['on']:
        return True
    line = sys.stdin.readline()
    if line == '':
        Gtk.main_quit()
        return False
    line = line.strip()
    if not line:
        return True
    try:
        message = json.loads(line)
    except json.JSONDecodeError as exc:
        reply({'ok': False, 'error': f'bad json: {exc}'})
        return True
    command = message.get('cmd')
    if command == 'identity':
        reply({
            'ok': True,
            'backend': 'webkitgtk',
            'api': 'WebKit2-4.1',
            'major': WebKit2.get_major_version(),
            'minor': WebKit2.get_minor_version(),
            'micro': WebKit2.get_micro_version(),
            'safari_certification': False,
        })
        return True
    if command == 'quit':
        reply({'ok': True})
        Gtk.main_quit()
        return False
    if command == 'load':
        busy['on'] = True
        url = message.get('url')
        if not isinstance(url, str) or not url:
            busy['on'] = False
            reply({'ok': False, 'error': 'load requires url'})
            return True
        handler = {'id': 0}

        def loaded(webview, event):
            if event != WebKit2.LoadEvent.FINISHED:
                return
            webview.disconnect(handler['id'])
            busy['on'] = False
            reply({'ok': True})

        handler['id'] = view.connect('load-changed', loaded)
        view.load_uri(url)
        return True
    if command == 'eval':
        expression = message.get('expression')
        if not isinstance(expression, str):
            reply({'ok': False, 'error': 'eval requires expression'})
            return True
        busy['on'] = True

        def finished(webview, result, _data):
            busy['on'] = False
            try:
                value = webview.evaluate_javascript_finish(result)
                text = None if value is None else value.to_string()
                reply({'ok': True, 'value': text})
            except Exception as exc:  # WebKit raises GError on script exceptions.
                reply({'ok': False, 'error': str(exc)})

        view.evaluate_javascript(expression, -1, None, None, None, finished, None)
        return True
    reply({'ok': False, 'error': f'unknown cmd {command}'})
    return True


GLib.io_add_watch(sys.stdin, GLib.IO_IN, on_stdin)
Gtk.main()
