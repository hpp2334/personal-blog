use std::collections::{HashMap, HashSet};
use std::io::{Read, Write};
use std::sync::Arc;
use std::vec;

use mio::net::{TcpListener, TcpStream};
use mio::{Events, Interest, Poll, Token, Waker};
use threadpool::ThreadPool;

struct Allocator {
    id: usize,
}
impl Allocator {
    pub fn new(start: usize) -> Self {
        Allocator { id: start }
    }
    pub fn next(&mut self) -> usize {
        let id = self.id;
        self.id += 1;
        id
    }
}

const SERVER_TOKEN: Token = Token(0);
const POLL_WAKER_TOKEN: Token = Token(1);
const WORKER_POOL_SIZE: usize = 12;
const CONNECTION_START_ID: usize = 1000;

fn process(buf: &Vec<u8>) -> Vec<u8> {
    let sleep_ms = 100;
    std::thread::sleep(std::time::Duration::from_millis(sleep_ms));

    buf.clone()
}
struct Reactor {
    server: TcpListener,
    poll: Poll,
    poll_waker: Arc<Waker>,
    worker_poll: ThreadPool,
    connection_allocator: Allocator,
    connections: HashMap<Token, TcpStream>,
}

impl Reactor {
    pub fn new(addr: &str) -> Self {
        let server = TcpListener::bind(addr.parse().unwrap()).unwrap();

        let poll = Poll::new().unwrap();
        let poll_waker = Arc::new(Waker::new(poll.registry(), POLL_WAKER_TOKEN).unwrap());
        let worker_poll = threadpool::ThreadPool::new(WORKER_POOL_SIZE);

        Self {
            server,
            poll,
            poll_waker,
            worker_poll,
            connection_allocator: Allocator::new(CONNECTION_START_ID),
            connections: HashMap::new(),
        }
    }

    pub fn run(&mut self) -> Result<(), std::io::Error> {
        let mut events = Events::with_capacity(128);
        // proccessed connection
        let (sender, receiver) = std::sync::mpsc::channel::<(Token, Vec<u8>)>();

        self.poll
            .registry()
            .register(&mut self.server, SERVER_TOKEN, Interest::READABLE)
            .unwrap();

        let mut connections_work_count = HashMap::new();
        let mut connections_closed = HashSet::new();

        loop {
            self.poll.poll(&mut events, None).unwrap();
            for event in events.iter() {
                match event.token() {
                    // Reactor: accept in Acceptor
                    SERVER_TOKEN => {
                        self.handle_accept().unwrap();
                    }
                    POLL_WAKER_TOKEN => continue,
                    Token(id) if id >= CONNECTION_START_ID => {
                        let token = Token(id);
                        let mut connection = self.connections.get(&token).unwrap();

                        let mut read_buf = vec![];

                        // Reactor: read buffer
                        loop {
                            let mut buf = vec![0; 128];
                            match connection.read(&mut buf) {
                                Ok(n) if n > 0 => {
                                    read_buf.append(&mut buf);
                                }
                                Ok(n) if n == 0 => {
                                    connections_closed.insert(token);
                                    break;
                                }
                                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => break,
                                Err(ref e) if e.kind() == std::io::ErrorKind::Interrupted => {
                                    continue
                                }
                                Err(e) => return Err(e),
                                _ => unreachable!(),
                            }
                        }

                        // Reactor: dispatch task in thread pool
                        let sender = sender.clone();
                        let waker = self.poll_waker.clone();
                        *connections_work_count.entry(token).or_insert(0) += 1;
                        self.worker_poll.execute(move || {
                            let buf = process(&read_buf);
                            sender.send((token, buf)).unwrap();
                            waker.wake().unwrap();
                        });
                    }
                    _ => unreachable!(),
                }
            }

            while let Ok((token, buf)) = receiver.try_recv() {
                println!("[{}] to send", token.0);
                let mut connection = self.connections.get(&token).unwrap();
                // Reactor: send buffer
                connection.write(&buf).unwrap();

                *connections_work_count.entry(token).or_insert(0) -= 1;
            }

            let connections_can_remove = connections_closed
                .iter()
                .filter(|token| {
                    let count = connections_work_count.get(*token);
                    count.is_none() || *count.unwrap() == 0
                })
                .map(|token| *token)
                .collect::<Vec<Token>>();

            connections_can_remove.into_iter().for_each(|token| {
                println!("[{}] to drop", token.0);
                let mut connection = self.connections.remove(&token).unwrap();
                connections_closed.remove(&token);
                connections_work_count.remove(&token);
                self.poll.registry().deregister(&mut connection).unwrap();
                drop(connection);
            })
        }
    }

    fn handle_accept(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        loop {
            // Reactor: accept in Acceptor
            match self.server.accept() {
                Ok((mut connection, _addr)) => {
                    let alloc = self.connection_allocator.next();
                    let token = Token(alloc);
                    self.poll
                        .registry()
                        .register(&mut connection, token, Interest::READABLE)
                        .unwrap();
                    self.connections.insert(token, connection);
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => break,
                Err(ref e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(err) => return Err(Box::new(err)),
            }
        }
        Ok(())
    }
}

fn main() {
    let mut reactor = Reactor::new("127.0.0.1:3001");
    reactor.run().unwrap();
}
