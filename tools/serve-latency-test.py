import http.server,sys,time,os
os.chdir(sys.argv[2]);delay=float(sys.argv[3])
class Handler(http.server.SimpleHTTPRequestHandler):
 def do_GET(self):time.sleep(delay);super().do_GET()
 def log_message(self,*args):pass
http.server.ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),Handler).serve_forever()
