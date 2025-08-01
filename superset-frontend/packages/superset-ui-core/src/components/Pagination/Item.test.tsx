/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { render, screen, userEvent } from '@superset-ui/core/spec';
import { Item } from './Item';

test('Item - click when the item is not active', async () => {
  const click = jest.fn();
  render(
    <Item onClick={click}>
      <div data-test="test" />
    </Item>,
  );
  expect(click).toHaveBeenCalledTimes(0);
  await userEvent.click(screen.getByRole('button'));
  expect(click).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('test')).toBeInTheDocument();
});

test('Item - click when the item is active', async () => {
  const click = jest.fn();
  render(
    <Item onClick={click} active>
      <div data-test="test" />
    </Item>,
  );
  expect(click).toHaveBeenCalledTimes(0);
  await userEvent.click(screen.getByRole('button'));
  expect(click).toHaveBeenCalledTimes(0);
  expect(screen.getByTestId('test')).toBeInTheDocument();
});
