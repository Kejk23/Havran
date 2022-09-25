import React from 'react'
import {UploadOutlined} from '@ant-design/icons'
import {Card, Upload, Button, Input} from 'antd'
import {FunctionComponent, useEffect, useState} from 'react'
import Markdown from '../../Markdown'
import Modal from 'antd/lib/modal/Modal'
import {useCallback} from 'react'
import {RcFile} from 'antd/lib/upload'
import {useHistory} from 'react-router-dom'
import * as path from 'path'

export const DASHBOARD_SELECT_CREATE_NEW_OPTION = 'create new'

const upload = (name: string, text: string) =>
  fetch(`/api/dynamic/upload/${name}`, {
    body: text,
    method: 'POST',
  })

export const CreateNewDashboardPage: FunctionComponent<{
  onEdit: () => void
  clientId: string
}> = ({onEdit, clientId}) => {
  const [helpText, setHelpText] = useState('')
  useEffect(() => {
    // load markdown from file
    const fetchMarkdown = async () => {
      try {
        const [txt, dir] = await Promise.all([
          // TODO: update document
          fetch('/help/DynamicDashboardPage.md').then((x) => x.text()),
          fetch('/api/dynamic/dir').then((x) => x.text()),
        ])
        setHelpText(
          (txt ?? '').startsWith('<!')
            ? 'HELP NOT FOUND'
            : txt.replace('{Dynamic Dir}', dir)
        )
      } catch (e) {
        console.error(e)
      }
    }

    fetchMarkdown()
  }, [])

  const [newPageName, setNewPageName] = useState<string>()

  const history = useHistory()

  const onFileUpload = useCallback(
    (file: RcFile) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const text = (e?.target?.result as string | undefined) ?? ''
        await upload(file.name, text).then(onEdit)
        const ext = path.extname(file.name).substring(1)
        const name = file.name.split('.').slice(0, -1).join('.')

        if (ext === 'json')
          // TODO: make this different. this way isn't stable
          setTimeout(() => history.push(`/dynamic/${clientId}/${name}`), 1000)
      }
      reader.readAsText(file)

      // cancel default behaviour of file upload
      return false
    },
    [clientId, history, onEdit]
  )

  return (
    <>
      <Modal
        visible={typeof newPageName === 'string'}
        onCancel={() => setNewPageName(undefined)}
        onOk={() => {
          if (newPageName === '') return
          upload(`${newPageName}.json`, `{"cells":[]}`).then(() => {
            setNewPageName(undefined)
            onEdit()
            // TODO: make this different. this way isn't stable
            setTimeout(
              () => history.push(`/dynamic/${clientId}/${newPageName}`),
              1000
            )
          })
        }}
      >
        <Input
          value={newPageName}
          onChange={(e) => setNewPageName(e.target.value)}
        />
      </Modal>
      <Card
        title="How to create new dynamic dashboard"
        extra={
          <>
            <Button onClick={() => setNewPageName('')}>Empty</Button>

            <Upload
              accept=".json,.svg"
              multiple={true}
              beforeUpload={onFileUpload}
            >
              <Button icon={<UploadOutlined />}>Upload</Button>
            </Upload>
          </>
        }
      >
        <Markdown source={helpText} />
      </Card>
    </>
  )
}
