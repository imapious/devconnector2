import React, { useState, useEffect } from "react";
import queryString from "query-string";
import io from "socket.io-client";

import TextContainer from "../text-container/TextContainer";
import Messages from "../messages/Messages";
import InfoBar from "../infobar/InfoBar";
import Input from "../input/Input";

import "./MainChat.css";

let socket;

const Chat = ({ location }) => {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [rooms, setRooms] = useState("");
  const [users, setUsers] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const ENDPOINT = "http://devsconnect205.herokuapp.com/";

  useEffect(
    () => {
      const { name, room } = queryString.parse(location.search);

      socket = io(ENDPOINT);

      setRoom(room);
      setName(name);

      socket.emit("join", { name, room }, error => {
        if (error) {
          alert(error);
        }
      });
    },
    [ENDPOINT, location.search]
  );

  useEffect(() => {
    socket.on("message", message => {
      setMessages(messages => [...messages, message]);
    });

    socket.on("roomData", ({ users }) => {
      setUsers(users);
    });
  }, []);

  const sendMessage = event => {
    event.preventDefault();

    if (message) {
      socket.emit("sendMessage", message, () => setMessage(""));
    }
  };

  return (
    <div className="outerChatContainer">
      <div className="chatContainer">
        <InfoBar room={room} />
        <Messages messages={messages} name={name} />
        <Input message={message} setMessage={setMessage} sendMessage={sendMessage} />
      </div>
      <TextContainer users={users} />
    </div>
  );
};

export default Chat;
